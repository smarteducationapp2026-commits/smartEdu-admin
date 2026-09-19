import { collection, doc, getDocs, query, serverTimestamp, where, writeBatch } from 'firebase/firestore'
import { db } from '../core/firebase'
import type { Exam, ExamQuestion, PublicExamQuestion, Subject } from '../core/types'

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

export async function createExam(params: CreateExamParams): Promise<string> {
  const timerFields = { timerEnabled: params.timerEnabled, timerType: params.timerType, timerSeconds: params.timerSeconds }
  const examRef = doc(collection(db, 'exams'))
  const batch = writeBatch(db)
  batch.set(examRef, { name: params.name.trim(), description: params.description.trim(), topicId: params.topicId, questions: params.questions, status: 'published', ...timerFields, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  batch.set(doc(db, 'examQuestions', examRef.id), { name: params.name.trim(), topicId: params.topicId, questionCount: params.questions.length, status: 'published', questions: stripAnswers(params.questions), ...timerFields, updatedAt: serverTimestamp() })
  await batch.commit()
  return examRef.id
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

