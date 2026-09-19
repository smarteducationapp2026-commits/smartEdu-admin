import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../core/firebase'
import type { Exam, ExamQuestion, PublicExamQuestion, SeedSubject, Subject } from '../core/types'

const stripAnswers = (questions: ExamQuestion[]): PublicExamQuestion[] =>
  questions.map(({ question, optionA, optionB, optionC, optionD }) => ({ question, optionA, optionB, optionC, optionD }))

export async function listSubjects(): Promise<Subject[]> {
  const snapshot = await getDocs(collection(db, 'subjects'))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Subject))
}

export async function listExamsForTopic(topicId: string): Promise<Exam[]> {
  const snapshot = await getDocs(query(collection(db, 'exams'), where('topicId', '==', topicId)))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Exam))
}

export type CreateSubjectItemParams = { name: string; description: string; parentId: string | null; type: 'subject' | 'topic' | 'subtopic'; status: 'active' | 'inactive'; order: number; includeMixed: boolean }

// Used for both "create subject" and "create topic/subtopic" — identical shape,
// just a different parentId/type, optionally paired with an auto-created "Mixed" subtopic.
export async function createSubjectItem(params: CreateSubjectItemParams): Promise<void> {
  const itemRef = doc(collection(db, 'subjects'))
  const batch = writeBatch(db)
  batch.set(itemRef, { name: params.name.trim(), description: params.description.trim(), parentId: params.parentId, type: params.type, status: params.status, order: params.order, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  if (params.includeMixed) {
    const mixedRef = doc(collection(db, 'subjects'))
    batch.set(mixedRef, { name: 'Mixed', parentId: itemRef.id, type: 'mixed', status: 'active', order: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  }
  await batch.commit()
}

export type CreateExamParams = { name: string; description: string; topicId: string; questions: ExamQuestion[]; timerEnabled: boolean; timerType: 'perQuestion' | 'overall' | null; timerSeconds: number | null }

export async function createExam(params: CreateExamParams): Promise<void> {
  const timerFields = { timerEnabled: params.timerEnabled, timerType: params.timerType, timerSeconds: params.timerSeconds }
  const examRef = doc(collection(db, 'exams'))
  const batch = writeBatch(db)
  batch.set(examRef, { name: params.name.trim(), description: params.description.trim(), topicId: params.topicId, questions: params.questions, status: 'published', ...timerFields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  batch.set(doc(db, 'examQuestions', examRef.id), { name: params.name.trim(), topicId: params.topicId, questionCount: params.questions.length, status: 'published', questions: stripAnswers(params.questions), ...timerFields, updatedAt: serverTimestamp() })
  await batch.commit()
}

// Recreates examQuestions (the public, answer-stripped summary the mobile app reads)
// from every exam — needed for exams created before examQuestions existed.
export async function syncExamSummaries(): Promise<number> {
  const examSnapshot = await getDocs(collection(db, 'exams'))
  let batch = writeBatch(db)
  let opCount = 0
  const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }
  for (const examDoc of examSnapshot.docs) {
    if (opCount >= 400) await flush()
    const exam = examDoc.data() as Exam
    batch.set(doc(db, 'examQuestions', examDoc.id), { name: exam.name, topicId: exam.topicId, questionCount: exam.questions?.length ?? 0, status: exam.status, questions: stripAnswers(exam.questions || []), timerEnabled: exam.timerEnabled ?? false, timerType: exam.timerType ?? null, timerSeconds: exam.timerSeconds ?? null, updatedAt: serverTimestamp() })
    opCount++
  }
  await flush()
  return examSnapshot.docs.length
}

export async function publishExam(examId: string): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'exams', examId), { status: 'published', updatedAt: serverTimestamp() })
  batch.update(doc(db, 'examQuestions', examId), { status: 'published', updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function updateExamQuestions(examId: string, questions: ExamQuestion[]): Promise<void> {
  const batch = writeBatch(db)
  batch.update(doc(db, 'exams', examId), { questions, updatedAt: serverTimestamp() })
  batch.update(doc(db, 'examQuestions', examId), { questions: stripAnswers(questions), updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function deleteSubjectTree(items: Subject[], rootId: string): Promise<void> {
  const descendantIds = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    items.forEach((candidate) => {
      if (candidate.parentId && descendantIds.has(candidate.parentId) && !descendantIds.has(candidate.id)) {
        descendantIds.add(candidate.id)
        changed = true
      }
    })
  }
  const batch = writeBatch(db)
  descendantIds.forEach((id) => batch.delete(doc(db, 'subjects', id)))
  await batch.commit()
}

export async function clearAllSubjects(items: Subject[]): Promise<number> {
  const examSnapshot = await getDocs(collection(db, 'exams'))
  let batch = writeBatch(db)
  let opCount = 0
  let removed = 0
  const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }
  for (const item of items) {
    if (opCount >= 400) await flush()
    batch.delete(doc(db, 'subjects', item.id))
    opCount++; removed++
  }
  for (const examDoc of examSnapshot.docs) {
    if (opCount >= 400) await flush()
    batch.delete(doc(db, 'exams', examDoc.id))
    opCount++; removed++
    if (opCount >= 400) await flush()
    batch.delete(doc(db, 'examQuestions', examDoc.id))
    opCount++
  }
  await flush()
  return removed
}

export async function seedSubjects(toCreate: SeedSubject[], startOrder: number): Promise<number> {
  let batch = writeBatch(db)
  let opCount = 0
  let created = 0
  let subjectOrder = startOrder
  const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }
  for (const subject of toCreate) {
    if (opCount >= 400) await flush()
    const subjectRef = doc(collection(db, 'subjects'))
    batch.set(subjectRef, { name: subject.name, description: '', parentId: null, type: 'subject', status: 'active', order: subjectOrder++, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    opCount++; created++
    for (const [topicIndex, topic] of subject.topics.entries()) {
      if (opCount >= 400) await flush()
      const topicRef = doc(collection(db, 'subjects'))
      batch.set(topicRef, { name: topic.name, description: '', parentId: subjectRef.id, type: 'topic', status: 'active', order: topicIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      opCount++; created++
      for (const [subtopicIndex, subtopicName] of (topic.subtopics || []).entries()) {
        if (opCount >= 400) await flush()
        const subtopicRef = doc(collection(db, 'subjects'))
        batch.set(subtopicRef, { name: subtopicName, description: '', parentId: topicRef.id, type: 'subtopic', status: 'active', order: subtopicIndex, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        opCount++; created++
      }
    }
  }
  await flush()
  return created
}
