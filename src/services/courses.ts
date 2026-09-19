import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../core/firebase'
import type { Course } from '../core/types'

export async function listCourses(): Promise<Course[]> {
  const snapshot = await getDocs(collection(db, 'courses'))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Course))
}

export async function updateCourseOffer(course: Course): Promise<void> {
  await updateDoc(doc(db, 'courses', course.id), { offer: course.offer || '', active: course.active !== false, updatedAt: serverTimestamp() })
}

export async function createCourse(title: string): Promise<string> {
  const courseRef = doc(collection(db, 'courses'))
  await setDoc(courseRef, { title, active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  return courseRef.id
}
