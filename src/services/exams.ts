import { collection, getDocs } from 'firebase/firestore'
import { db } from '../core/firebase'
import type { Exam, Subject } from '../core/types'

export async function loadExams(): Promise<{ exams: Exam[]; topicNames: Record<string, string> }> {
  const [examSnapshot, subjectSnapshot] = await Promise.all([
    getDocs(collection(db, 'exams')),
    getDocs(collection(db, 'subjects')),
  ])
  return {
    exams: examSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Exam)),
    topicNames: Object.fromEntries(subjectSnapshot.docs.map((item) => [item.id, (item.data() as Subject).name])),
  }
}
