import { collection, getDocs } from 'firebase/firestore'
import { db } from '../core/firebase'

export type OverviewCounts = { users: number; courses: number; tests: number }

export async function getOverviewCounts(): Promise<OverviewCounts> {
  const [users, courses, tests] = await Promise.all([
    getDocs(collection(db, 'users')),
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'tests')),
  ])
  return {
    users: users.docs.filter((item) => item.data().role !== 'superAdmin').length,
    courses: courses.size,
    tests: tests.size,
  }
}
