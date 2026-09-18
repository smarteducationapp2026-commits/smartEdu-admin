import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../core/firebase'

export function Overview() {
  const [counts, setCounts] = useState({ users: 0, courses: 0, tests: 0 })
  useEffect(() => { Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'courses')), getDocs(collection(db, 'tests'))]).then(([users, courses, tests]) => setCounts({ users: users.docs.filter((item) => item.data().role !== 'superAdmin').length, courses: courses.size, tests: tests.size })) }, [])
  return <div className="grid"><div className="stat"><span>Total users</span><strong>{counts.users}</strong></div><div className="stat"><span>Courses</span><strong>{counts.courses}</strong></div><div className="stat"><span>Tests</span><strong>{counts.tests}</strong></div><div className="card"><h3>Admin security</h3><p>Admin access is controlled by the Firestore profile role. Keep administrator roles limited to trusted accounts.</p></div></div>
}
