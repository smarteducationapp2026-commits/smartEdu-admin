import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../core/firebase'
import type { ExamAnswerOption, ExamQuestion, PricingType, PublicExam, Subject, TestSeries } from '../core/types'

export type TestSeriesData = { series: TestSeries[]; exams: PublicExam[]; topicNames: Record<string, string> }

export async function loadTestSeriesData(): Promise<TestSeriesData> {
  const [seriesSnap, examSnap, subjectSnap] = await Promise.all([
    getDocs(collection(db, 'testSeries')),
    getDocs(collection(db, 'examQuestions')),
    getDocs(collection(db, 'subjects')),
  ])
  return {
    series: seriesSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TestSeries),
    // Drafts included: they can be attached to a series and stay hidden
    // from students (mobile only renders published exams) until published.
    exams: examSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as PublicExam),
    topicNames: Object.fromEntries(
      subjectSnap.docs.map((item) => [item.id, (item.data() as Subject).name]),
    ),
  }
}

// Publishing is one-way — once a series is live there's no "unpublish". This just
// pushes the currently-saved fields live and stamps publishedAt so the admin panel
// can tell whether there are saved-but-not-yet-published changes.
export async function publishTestSeries(seriesId: string): Promise<void> {
  await updateDoc(doc(db, 'testSeries', seriesId), { status: 'published', publishedAt: serverTimestamp(), updatedAt: serverTimestamp() })
}

// Cascade: every draft test in the series goes live with it, so students
// always see the full series. Both the answer-key copy and the public copy
// are flipped together (same pairing as publishExam in subjects).
export async function publishExams(examIds: string[]): Promise<void> {
  if (examIds.length === 0) return
  let batch = writeBatch(db)
  let opCount = 0
  const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }
  for (const examId of examIds) {
    if (opCount >= 400) await flush()
    batch.update(doc(db, 'exams', examId), { status: 'published', updatedAt: serverTimestamp() })
    opCount++
    if (opCount >= 400) await flush()
    batch.update(doc(db, 'examQuestions', examId), { status: 'published', updatedAt: serverTimestamp() })
    opCount++
  }
  await flush()
}

export type SaveTestSeriesFields = { title: string; description: string; examIds: string[]; status: 'draft' | 'published'; pricingType: PricingType; price: number }

export async function saveTestSeries(seriesId: string | null, fields: SaveTestSeriesFields): Promise<string> {
  const seriesRef = seriesId ? doc(db, 'testSeries', seriesId) : doc(collection(db, 'testSeries'))
  await setDoc(seriesRef, {
    title: fields.title.trim(),
    description: fields.description.trim(),
    examIds: fields.examIds,
    status: fields.status,
    pricingType: fields.pricingType,
    price: fields.pricingType === 'paid' ? fields.price : 0,
    updatedAt: serverTimestamp(),
    ...(seriesId ? {} : { createdAt: serverTimestamp() }),
  }, { merge: true })
  return seriesRef.id
}

export async function deleteTestSeries(seriesId: string): Promise<void> {
  await deleteDoc(doc(db, 'testSeries', seriesId))
}

const DEMO_SERIES_COUNT = 8
const DEMO_EXAMS_PER_SERIES = 10
const DEMO_QUESTIONS_PER_EXAM = 20
const OPTION_LETTERS: ExamAnswerOption[] = ['A', 'B', 'C', 'D']

function demoQuestions(examLabel: string): ExamQuestion[] {
  return Array.from({ length: DEMO_QUESTIONS_PER_EXAM }, (_, i) => ({
    question: `${examLabel} — Question ${i + 1}: choose the correct option.`,
    optionA: `${examLabel} Q${i + 1} · Option A`,
    optionB: `${examLabel} Q${i + 1} · Option B`,
    optionC: `${examLabel} Q${i + 1} · Option C`,
    optionD: `${examLabel} Q${i + 1} · Option D`,
    correctAnswer: OPTION_LETTERS[i % 4],
    explanation: `Placeholder explanation for question ${i + 1} of ${examLabel}.`,
  }))
}

export { DEMO_SERIES_COUNT, DEMO_EXAMS_PER_SERIES, DEMO_QUESTIONS_PER_EXAM }

export async function seedDemoTestSeries(existingSeries: TestSeries[]): Promise<number> {
  const existingTitles = new Set(existingSeries.map((item) => item.title))
  let batch = writeBatch(db)
  let opCount = 0
  let seriesCreated = 0
  const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }

  for (let s = 1; s <= DEMO_SERIES_COUNT; s++) {
    const seriesTitle = `Demo Test Series ${s}`
    if (existingTitles.has(seriesTitle)) continue

    const examIds: string[] = []
    for (let e = 1; e <= DEMO_EXAMS_PER_SERIES; e++) {
      const examLabel = `${seriesTitle} — Exam ${e}`
      const questions = demoQuestions(examLabel)

      // No topicId — demo exams aren't part of the Subjects tree, only
      // reachable through their test series.
      if (opCount >= 400) await flush()
      const examRef = doc(collection(db, 'exams'))
      batch.set(examRef, { name: examLabel, description: '', topicId: '', questions, status: 'published', timerEnabled: false, timerType: null, timerSeconds: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
      opCount++

      if (opCount >= 400) await flush()
      batch.set(doc(db, 'examQuestions', examRef.id), {
        name: examLabel,
        topicId: '',
        questionCount: questions.length,
        status: 'published',
        questions: questions.map(({ question, optionA, optionB, optionC, optionD }) => ({ question, optionA, optionB, optionC, optionD })),
        timerEnabled: false,
        timerType: null,
        timerSeconds: null,
        updatedAt: serverTimestamp(),
      })
      opCount++
      examIds.push(examRef.id)
    }

    if (opCount >= 400) await flush()
    const seriesRef = doc(collection(db, 'testSeries'))
    batch.set(seriesRef, { title: seriesTitle, description: `Auto-generated demo series with ${DEMO_EXAMS_PER_SERIES} exams.`, examIds, status: 'published', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    opCount++
    seriesCreated++
  }
  await flush()
  return seriesCreated
}
