import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Exam, Subject } from '../../../core/types'

export function Exams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [topicNames, setTopicNames] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)

  useEffect(() => {
    Promise.all([getDocs(collection(db, 'exams')), getDocs(collection(db, 'subjects'))])
      .then(([examSnapshot, subjectSnapshot]) => {
        setExams(examSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Exam)))
        setTopicNames(Object.fromEntries(subjectSnapshot.docs.map((item) => [item.id, (item.data() as Subject).name])))
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load exams.'))
  }, [])

  if (selectedExam) {
    return <div className="stack">
      <button className="back-link" onClick={() => setSelectedExam(null)} aria-label="Back to exams" title="Back to exams">←</button>
      <div className="metadata-view">
        <h2>{selectedExam.name}</h2>
        <p className="description">{selectedExam.description || 'No description provided.'}</p>
        <div className="row">
          <span className={`status-pill status-${selectedExam.status}`}>{selectedExam.status}</span>
          <span className="meta-chip">{topicNames[selectedExam.topicId] || 'Unknown topic'}</span>
          <span className="meta-chip">{selectedExam.questions?.length ?? 0} questions</span>
        </div>
      </div>
      <div className="question-cards">
        {(selectedExam.questions || []).map((question, index) => <div className="question-card" key={index}>
          <p className="question-index">Question {index + 1}</p>
          <p className="question-text">{question.question}</p>
          <div className="option-list">
            {[['A', question.optionA], ['B', question.optionB], ['C', question.optionC], ['D', question.optionD]].map(([letter, text]) =>
              <div key={letter} className={`option-row ${question.correctAnswer === letter ? 'correct' : ''}`}>
                <span className="option-letter">{letter}</span>
                <span className="option-text">{text}</span>
                {question.correctAnswer === letter && <span className="option-check">✓</span>}
              </div>)}
          </div>
          {question.explanation && <p className="question-explanation"><strong>Explanation:</strong> {question.explanation}</p>}
        </div>)}
      </div>
    </div>
  }

  return <div className="stack">
    <div className="card"><h3>Exams</h3><p>Exams are created from a topic or subtopic under Subjects. Click one to review its questions.</p></div>
    {message && <p className="notice">{message}</p>}
    {exams.length === 0 && !message && <div className="card"><p>No exams found.</p></div>}
    {exams.length > 0 && <div className="card table-wrap">
      <table>
        <thead><tr><th>Exam</th><th>Topic</th><th>Questions</th><th>Status</th></tr></thead>
        <tbody>
          {exams.map((exam) => <tr key={exam.id} className="clickable-row" title="Review this exam's questions" onClick={() => setSelectedExam(exam)}>
            <td><span className="exam-name-link">{exam.name}</span></td>
            <td>{topicNames[exam.topicId] || '—'}</td>
            <td>{exam.questions?.length ?? 0}</td>
            <td>{exam.status}</td>
          </tr>)}
        </tbody>
      </table>
    </div>}
  </div>
}
