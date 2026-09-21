import { collection, getDocs } from 'firebase/firestore'
import { db } from '../core/firebase'

export type OverviewCounts = {
  users: number
  subjects: number
  exams: number
  testSeries: number
}

export async function getOverviewCounts(): Promise<OverviewCounts> {
  const [users, subjects, exams, testSeries] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'subjects')),
    getDocs(collection(db, 'exams')),
    getDocs(collection(db, 'testSeries')),
  ])
  return {
    users: users.docs.filter((item) => item.data().role !== 'superAdmin').length,
    subjects: subjects.size,
    exams: exams.size,
    testSeries: testSeries.size,
  }
}
