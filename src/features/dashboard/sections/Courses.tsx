import { useEffect, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Course } from '../../../core/types'

export function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  useEffect(() => { getDocs(collection(db, 'courses')).then((s) => setCourses(s.docs.map((item) => ({ id: item.id, ...item.data() } as Course)))) }, [])
  async function save(course: Course) {
    await updateDoc(doc(db, 'courses', course.id), { offer: course.offer || '', active: course.active !== false, updatedAt: serverTimestamp() })
    setCourses((items) => items.map((item) => item.id === course.id ? course : item))
  }
  return <div className="stack">{courses.length === 0 && <div className="card"><p>No courses found. Add course documents to the <code>courses</code> collection.</p></div>}{courses.map((course) => <div className="card row course" key={course.id}><div><h3>{course.title}</h3><small>{course.id}</small></div><input value={course.offer || ''} placeholder="Offer, e.g. 20% off" onChange={(e) => setCourses((items) => items.map((item) => item.id === course.id ? { ...item, offer: e.target.value } : item))} /><button onClick={() => save(course)}>Save offer</button></div>)}</div>
}
