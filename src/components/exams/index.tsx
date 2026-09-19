import { useEffect, useState } from 'react'
import type { Exam } from '../../core/types'
import { loadExams } from '../../services/exams'
import { BackHeading } from '../shared/BackHeading'
import { QuestionCard } from '../shared/QuestionCard'
import { StatusPill } from '../shared/StatusPill'

export function Exams() {
  const [exams, setExams] = useState<Exam[]>([])
  const [topicNames, setTopicNames] = useState<Record<string, string>>({})
  const [message, setMessage] = useState('')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)

  useEffect(() => {
    void loadExams()
      .then(({ exams, topicNames }) => {
        setExams(exams)
        setTopicNames(topicNames)
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load exams.'),
      )
  }, [])

  if (selectedExam) {
    return (
      <div className="stack">
        <BackHeading
          title={selectedExam.name}
          onBack={() => setSelectedExam(null)}
          label="Back to exams"
        />
        <div className="metadata-view">
          <p className="description">{selectedExam.description || 'No description provided.'}</p>
          <div className="row">
            <StatusPill status={selectedExam.status} />
            <span className="meta-chip">{topicNames[selectedExam.topicId] || 'Unknown topic'}</span>
            <span className="meta-chip">{selectedExam.questions?.length ?? 0} questions</span>
          </div>
        </div>
        <div className="question-cards">
          {(selectedExam.questions || []).map((question, index) => (
            <QuestionCard key={index} question={question} index={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="card">
        <h3>Exams</h3>
        <p>
          Exams are created from a topic or subtopic under Subjects. Click one to review its
          questions.
        </p>
      </div>
      {message && <p className="notice">{message}</p>}
      {exams.length === 0 && !message && (
        <div className="card">
          <p>No exams found.</p>
        </div>
      )}
      {exams.length > 0 && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr>
                <th>Exam</th>
                <th>Topic</th>
                <th>Questions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr
                  key={exam.id}
                  className="clickable-row"
                  title="Review this exam's questions"
                  onClick={() => setSelectedExam(exam)}
                >
                  <td>
                    <span className="exam-name-link">{exam.name}</span>
                  </td>
                  <td>{topicNames[exam.topicId] || '—'}</td>
                  <td>{exam.questions?.length ?? 0}</td>
                  <td>
                    <StatusPill status={exam.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
