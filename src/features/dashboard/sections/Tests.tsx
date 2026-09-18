import { useEffect, useState } from 'react'
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Test } from '../../../core/types'

export function Tests() {
  const [tests, setTests] = useState<Test[]>([]); const [message, setMessage] = useState('')
  useEffect(() => { getDocs(collection(db, 'tests')).then((s) => setTests(s.docs.map((item) => ({ id: item.id, ...item.data() } as Test)))).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load tests.')) }, [])
  async function save(test: Test) {
    try { await updateDoc(doc(db, 'tests', test.id), { title: test.title || 'Untitled test', courseId: test.courseId || '', active: test.active !== false, questionCount: Number(test.questionCount) || 0, updatedAt: serverTimestamp() }); setMessage('Test saved.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save test.') }
  }
  return <div className="stack">{message && <p className="notice">{message}</p>}{tests.length === 0 && <div className="card"><p>No tests found. Add test documents to the <code>tests</code> collection.</p></div>}{tests.map((test) => <div className="card row test" key={test.id}><div><h3>{test.title || 'Untitled test'}</h3><small>{test.id}</small></div><input value={test.courseId || ''} placeholder="Course ID" onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, courseId: e.target.value } : item))} /><input type="number" min="0" value={test.questionCount || 0} aria-label="Question count" onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, questionCount: Number(e.target.value) } : item))} /><label className="checkbox"><input type="checkbox" checked={test.active !== false} onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, active: e.target.checked } : item))} /> Active</label><button onClick={() => save(test)}>Save</button></div>)}</div>
}
