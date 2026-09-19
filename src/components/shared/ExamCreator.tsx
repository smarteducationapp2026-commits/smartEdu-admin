import { useState } from 'react'
import './shared.css'
import type { ExamQuestion } from '../../core/types'
import { createExam } from '../../services/subjects'
import { parseExamQuestionsCsv } from './examQuestionCsv'
import { parseExamQuestionsWord } from './examQuestionsWord'
import { QuestionCard } from './QuestionCard'

export function ExamCreator({
  topicId,
  onCreated,
  onCancel,
}: {
  topicId: string
  onCreated: (examId: string) => void
  onCancel: () => void
}) {
  const [examName, setExamName] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerType, setTimerType] = useState<'perQuestion' | 'overall'>('perQuestion')
  const [timerMinutes, setTimerMinutes] = useState('1')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<ExamQuestion | null>(null)

  function handleExamFile(file: File | null) {
    setExamFile(file)
    setExamQuestions([])
    setStep('upload')
  }

  async function reviewExamQuestions() {
    if (!examFile) return
    try {
      const isWord = examFile.name.toLowerCase().endsWith('.docx')
      const result = isWord
        ? await parseExamQuestionsWord(await examFile.arrayBuffer())
        : parseExamQuestionsCsv(await examFile.text())
      if (!result.ok) {
        setExamQuestions([])
        setStep('upload')
        setMessage(result.error)
        return
      }
      setExamQuestions(result.questions)
      setStep('review')
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review questions file.')
    }
  }

  function startEditQuestion(index: number, question: ExamQuestion) {
    setEditingIndex(index)
    setEditDraft({ ...question })
  }
  function cancelEditQuestion() {
    setEditingIndex(null)
    setEditDraft(null)
  }

  async function submit() {
    if (!examName.trim() || examQuestions.length === 0 || submitting) return
    const timerSeconds = timerEnabled ? Math.max(1, Number(timerMinutes) || 1) * 60 : null
    setSubmitting(true)
    setMessage('Creating test…')
    try {
      const examId = await createExam({
        name: examName,
        description: examDescription,
        topicId,
        questions: examQuestions,
        timerEnabled,
        timerType: timerEnabled ? timerType : null,
        timerSeconds,
      })
      onCreated(examId)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create test.')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'review') {
    return (
      <div className="exam-review">
        <div className="form-header">
          <h3>Review questions</h3>
          <p>
            {examQuestions.length} question{examQuestions.length === 1 ? '' : 's'} parsed from{' '}
            <strong>{examFile?.name}</strong>. Check them, then submit.
          </p>
        </div>
        <div className="question-cards">
          {examQuestions.map((question, index) => {
            if (editingIndex === index && editDraft) {
              return (
                <div className="question-card editing" key={index}>
                  <p className="question-index">Question {index + 1}</p>
                  <div className="form">
                    <label>
                      Question
                      <textarea
                        value={editDraft.question}
                        onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                      />
                    </label>
                    <label>
                      Option A
                      <input
                        value={editDraft.optionA}
                        onChange={(e) => setEditDraft({ ...editDraft, optionA: e.target.value })}
                      />
                    </label>
                    <label>
                      Option B
                      <input
                        value={editDraft.optionB}
                        onChange={(e) => setEditDraft({ ...editDraft, optionB: e.target.value })}
                      />
                    </label>
                    <label>
                      Option C
                      <input
                        value={editDraft.optionC}
                        onChange={(e) => setEditDraft({ ...editDraft, optionC: e.target.value })}
                      />
                    </label>
                    <label>
                      Option D
                      <input
                        value={editDraft.optionD}
                        onChange={(e) => setEditDraft({ ...editDraft, optionD: e.target.value })}
                      />
                    </label>
                    <label>
                      Correct answer
                      <select
                        value={editDraft.correctAnswer}
                        onChange={(e) =>
                          setEditDraft({
                            ...editDraft,
                            correctAnswer: e.target.value as ExamQuestion['correctAnswer'],
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
                        onChange={(e) => setEditDraft({ ...editDraft, explanation: e.target.value })}
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
                          setExamQuestions((current) =>
                            current.map((q, i) => (i === index ? editDraft : q)),
                          )
                          cancelEditQuestion()
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              )
            }
            return (
              <QuestionCard
                key={index}
                question={question}
                index={index}
                onEdit={() => startEditQuestion(index, question)}
              />
            )
          })}
        </div>
        <div className="row">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="medium-button" disabled={submitting} onClick={() => void submit()}>
            {submitting ? 'Creating…' : 'Submit'}
          </button>
        </div>
        {message && <p className="notice">{message}</p>}
      </div>
    )
  }

  return (
    <div className="form create-metadata-form">
      <div className="form-header">
        <h3>Create test</h3>
        <p>Upload a questions CSV, then review it.</p>
      </div>
      <label>
        Test name
        <input value={examName} onChange={(e) => setExamName(e.target.value)} />
      </label>
      <label>
        Description
        <textarea value={examDescription} onChange={(e) => setExamDescription(e.target.value)} />
      </label>
      <div className="form-header">
        <h3>Timer</h3>
      </div>
      <div className="row">
        <label className="checkbox">
          <input
            type="radio"
            name="creatorTimerEnabled"
            checked={!timerEnabled}
            onChange={() => setTimerEnabled(false)}
          />{' '}
          No timer
        </label>
        <label className="checkbox">
          <input
            type="radio"
            name="creatorTimerEnabled"
            checked={timerEnabled}
            onChange={() => setTimerEnabled(true)}
          />{' '}
          Timer
        </label>
      </div>
      {timerEnabled && (
        <>
          <div className="row">
            <label className="checkbox">
              <input
                type="radio"
                name="creatorTimerType"
                checked={timerType === 'perQuestion'}
                onChange={() => setTimerType('perQuestion')}
              />{' '}
              Per question
            </label>
            <label className="checkbox">
              <input
                type="radio"
                name="creatorTimerType"
                checked={timerType === 'overall'}
                onChange={() => setTimerType('overall')}
              />{' '}
              Overall exam
            </label>
          </div>
          <label>
            {timerType === 'perQuestion' ? 'Minutes per question' : 'Total exam minutes'}
            <input
              type="number"
              min="1"
              value={timerMinutes}
              onChange={(e) => setTimerMinutes(e.target.value)}
            />
          </label>
        </>
      )}
      <div className="csv-upload-wrap">
        <label
          className={`csv-dropzone ${dragActive ? 'drag-active' : ''} ${examFile ? 'has-file' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragActive(true)
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragActive(false)
            const file = e.dataTransfer.files?.[0]
            if (file) handleExamFile(file)
          }}
        >
          <input
            type="file"
            accept=".csv,text/csv,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => handleExamFile(e.target.files?.[0] || null)}
          />
          <span className="csv-icon">↑</span>
          {examFile ? (
            <span className="csv-filename">{examFile.name}</span>
          ) : (
            <>
              <span className="csv-title">Click to upload or drag & drop</span>
              <span className="csv-hint">.csv or .docx file with your exam questions</span>
            </>
          )}
        </label>
        {examFile && (
          <button
            type="button"
            className="small-button secondary"
            onClick={() => handleExamFile(null)}
          >
            Remove file
          </button>
        )}
        <details className="csv-columns-hint">
          <summary>Expected format</summary>
          <p>
            <strong>.csv</strong> columns: question, optionA, optionB, optionC, optionD, correctAnswer
            (A/B/C/D), explanation (optional).
          </p>
          <p>
            <strong>.docx</strong>: one table per question, with rows labeled Question, Type, Option
            (one row per option, starting each with "(a)", "(b)", "(c)", "(d)", and marked
            correct/Incorrect in the next column), Solution (with an "Explanation:" section), and Marks.
          </p>
        </details>
      </div>
      <div className="row">
        <button className="back-link" type="button" onClick={onCancel} aria-label="Cancel" title="Cancel">
          ←
        </button>
        <button type="button" onClick={() => void reviewExamQuestions()} disabled={!examName.trim() || !examFile}>
          Review
        </button>
      </div>
      {message && <p className="notice">{message}</p>}
    </div>
  )
}
