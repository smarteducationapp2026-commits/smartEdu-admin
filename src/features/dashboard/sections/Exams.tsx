import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Exam, Subject } from '../../../core/types'

export function Exams({ onSelectExam }: { onSelectExam: (topicId: string) => void }) {
  const [exams, setExams] = useState<Exam[]>([])
  const [topicNames, setTopicNames] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  useEffect(() => {
    Promise.all([getDocs(collection(db, 'exams')), getDocs(collection(db, 'subjects'))])
      .then(([examSnapshot, subjectSnapshot]) => {
        setExams(examSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Exam)))
        setTopicNames(Object.fromEntries(subjectSnapshot.docs.map((item) => [item.id, (item.data() as Subject).name])))
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load exams.'))
  }, [])
  return <div className="stack"><div className="card"><h3>Exams</h3><p>Exams are created from a topic or subtopic under Subjects.</p></div>{message && <p className="notice">{message}</p>}{exams.length === 0 && !message && <div className="card"><p>No exams found.</p></div>}{exams.length > 0 && <div className="card table-wrap"><table><thead><tr><th>Exam</th><th>Topic</th><th>Questions</th><th>Status</th></tr></thead><tbody>{exams.map((exam) => <tr key={exam.id} className="clickable-row" title="Review this exam's topic" onClick={() => onSelectExam(exam.topicId)}><td><span className="exam-name-link">{exam.name}</span></td><td>{topicNames[exam.topicId] || '—'}</td><td>{exam.questions?.length ?? 0}</td><td>{exam.status}</td></tr>)}</tbody></table></div>}</div>
}
