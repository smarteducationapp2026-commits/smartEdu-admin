import { useState } from 'react'
import type { Exam, ExamQuestion } from '../../core/types'
import { BackHeading } from './BackHeading'
import { QuestionCard } from './QuestionCard'
import { StatusPill } from './StatusPill'

// Shared exam viewer: every question with answers, editable in place.
// Used from Subjects (topic exams) and Test Series (attached tests).
export function ExamDetails({
  exam,
  backLabel,
  canEdit,
  message,
  onBack,
  onUpdateQuestion,
  onPublish,
}: {
  exam: Exam
  backLabel: string
  canEdit: boolean
  message?: string
  onBack: () => void
  onUpdateQuestion: (index: number, updated: ExamQuestion) => void
  onPublish?: () => void
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<ExamQuestion | null>(null)

  function startEditQuestion(index: number, question: ExamQuestion) {
    setEditingIndex(index)
    setEditDraft({ ...question })
  }
  function cancelEditQuestion() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  const questions = exam.questions || []

  return (
    <div className="metadata-view">
      <BackHeading
        title={exam.name}
        onBack={() => {
          cancelEditQuestion()
          onBack()
        }}
        label={backLabel}
      />
      <p className="description">{exam.description || 'No description provided.'}</p>
      <div className="meta-chips">
        <StatusPill status={exam.status} />
        <span className="meta-chip">{questions.length} questions</span>
      </div>
      <div className="question-cards">
        {questions.map((question, index) => {
          if (canEdit && editingIndex === index && editDraft)
            return (
              <div className="question-card editing" key={index}>
                <p className="question-index">Question {index + 1}</p>
                <div className="form">
                  <label>
                    Question
                    <textarea
                      value={editDraft.question}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, question: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Option A
                    <input
                      value={editDraft.optionA}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, optionA: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Option B
                    <input
                      value={editDraft.optionB}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, optionB: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Option C
                    <input
                      value={editDraft.optionC}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, optionC: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Option D
                    <input
                      value={editDraft.optionD}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, optionD: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Correct answer
                    <select
                      value={editDraft.correctAnswer}
                      onChange={(event) =>
                        setEditDraft({
                          ...editDraft,
                          correctAnswer: event.target.value as ExamQuestion['correctAnswer'],
                        })
                      }
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                      <option value="D">D</option>
                    </select>
                  </label>
                  <label>
                    Explanation
                    <textarea
                      value={editDraft.explanation || ''}
                      onChange={(event) =>
                        setEditDraft({ ...editDraft, explanation: event.target.value })
                      }
                    />
                  </label>
                  <div className="row">
                    <button
                      className="back-link"
                      type="button"
                      onClick={cancelEditQuestion}
                      aria-label="Cancel"
                      title="Cancel"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateQuestion(index, editDraft)
                        cancelEditQuestion()
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )
          return (
            <QuestionCard
              key={index}
              question={question}
              index={index}
              onEdit={canEdit ? () => startEditQuestion(index, question) : undefined}
            />
          )
        })}
      </div>
      {canEdit && onPublish && exam.status !== 'published' && (
        <button className="medium-button" onClick={onPublish}>
          Publish
        </button>
      )}
      {message && <p className="notice">{message}</p>}
    </div>
  )
}
