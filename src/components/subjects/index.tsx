import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import type { Exam, ExamQuestion, Subject } from '../../core/types'
import {
  clearAllSubjects,
  createExam,
  createSubjectItem,
  deleteSubjectTree,
  listExamsForTopic,
  listSubjects,
  publishExam,
  seedSubjects,
  syncExamSummaries,
  updateExamQuestions,
} from '../../services/subjects'
import { BackHeading } from '../shared/BackHeading'
import { IconButton } from '../shared/IconButton'
import { QuestionCard } from '../shared/QuestionCard'
import { StatusPill } from '../shared/StatusPill'
import { SEED_SUBJECTS } from './subjectSeedData'
import { parseExamQuestionsCsv } from './examQuestionCsv'

export function Subjects({ role }: { role: 'admin' | 'superAdmin' }) {
  const [items, setItems] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [includeMixed, setIncludeMixed] = useState(false)
  const [topicParentId, setTopicParentId] = useState('')
  const [examName, setExamName] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [timerEnabled, setTimerEnabled] = useState(false)
  const [timerType, setTimerType] = useState<'perQuestion' | 'overall'>('perQuestion')
  const [timerMinutes, setTimerMinutes] = useState('1')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([])
  const [examStep, setExamStep] = useState<'upload' | 'review'>('upload')
  const [actionOpen, setActionOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [viewItemId, setViewItemId] = useState('')
  const [createView, setCreateView] = useState<'subject' | 'topic' | 'exam' | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const [seeding, setSeeding] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [syncingSummaries, setSyncingSummaries] = useState(false)
  const [topicExams, setTopicExams] = useState<Exam[]>([])
  const [topicExamsLoading, setTopicExamsLoading] = useState(false)
  const [reviewingExam, setReviewingExam] = useState<Exam | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editDraft, setEditDraft] = useState<ExamQuestion | null>(null)
  const canEdit = role === 'superAdmin'
  const load = async () => {
    setItems(await listSubjects())
  }
  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Unable to load subjects.'),
    )
  }, [])
  useEffect(() => {
    const viewed = items.find((item) => item.id === viewItemId)
    if (!viewed || (viewed.type !== 'topic' && viewed.type !== 'subtopic')) {
      setTopicExams([])
      return
    }
    setTopicExamsLoading(true)
    listExamsForTopic(viewItemId)
      .then(setTopicExams)
      .catch(() => setMessage('Unable to load exams for this topic.'))
      .finally(() => setTopicExamsLoading(false))
  }, [viewItemId, items])
  useEffect(() => {
    setReviewingExam(null)
    cancelEditQuestion()
  }, [viewItemId])
  const childrenOf = (id: string | null) =>
    items
      .filter((item) => (item.parentId || null) === id && (id !== null || item.type !== 'mixed'))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  async function createItem(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !name.trim()) return
    try {
      await createSubjectItem({
        name,
        description,
        parentId: null,
        type: 'subject',
        status,
        order: childrenOf(null).length,
        includeMixed,
      })
      resetCreateForm()
      setMessage('Subject created.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create subject item.')
    }
  }
  function resetCreateForm() {
    setName('')
    setDescription('')
    setStatus('active')
    setIncludeMixed(false)
    setTopicParentId('')
    setExamName('')
    setExamDescription('')
    setTimerEnabled(false)
    setTimerType('perQuestion')
    setTimerMinutes('1')
    setExamFile(null)
    setExamQuestions([])
    setExamStep('upload')
    setSelectedItemId('')
    setViewItemId('')
    setCreateView(null)
  }
  function openCreateView(view: 'subject' | 'topic' | 'exam', selectedParentId = '') {
    resetCreateForm()
    setTopicParentId(selectedParentId)
    setCreateView(view)
    setActionOpen(false)
  }
  function finishExamCreation(topicId: string) {
    setName('')
    setDescription('')
    setStatus('active')
    setIncludeMixed(false)
    setTopicParentId('')
    setExamName('')
    setExamDescription('')
    setTimerEnabled(false)
    setTimerType('perQuestion')
    setTimerMinutes('1')
    setExamFile(null)
    setExamQuestions([])
    setExamStep('upload')
    setSelectedItemId('')
    setCreateView(null)
    setViewItemId(topicId)
  }
  async function createTopic(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !topicParentId || !name.trim()) return
    const parent = items.find((item) => item.id === topicParentId)
    try {
      await createSubjectItem({
        name,
        description,
        parentId: topicParentId,
        type: parent?.type === 'topic' ? 'subtopic' : 'topic',
        status,
        order: childrenOf(topicParentId).length,
        includeMixed,
      })
      resetCreateForm()
      setMessage('Topic created.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create topic.')
    }
  }
  function handleExamFile(file: File | null) {
    setExamFile(file)
    setExamQuestions([])
    setExamStep('upload')
  }
  async function reviewExamQuestions() {
    if (!examFile) return
    try {
      const text = await examFile.text()
      const result = parseExamQuestionsCsv(text)
      if (!result.ok) {
        setExamQuestions([])
        setExamStep('upload')
        setMessage(result.error)
        return
      }
      setExamQuestions(result.questions)
      setExamStep('review')
      setMessage('')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to review questions CSV.')
    }
  }
  async function submitExam() {
    if (!canEdit || !examName.trim() || !topicParentId || examQuestions.length === 0) return
    const createdTopicId = topicParentId
    const timerSeconds = timerEnabled ? Math.max(1, Number(timerMinutes) || 1) * 60 : null
    try {
      await createExam({
        name: examName,
        description: examDescription,
        topicId: topicParentId,
        questions: examQuestions,
        timerEnabled,
        timerType: timerEnabled ? timerType : null,
        timerSeconds,
      })
      finishExamCreation(createdTopicId)
      setMessage('Exam created and published.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to submit exam.')
    }
  }
  async function syncExams() {
    if (!canEdit || syncingSummaries) return
    setSyncingSummaries(true)
    try {
      const count = await syncExamSummaries()
      setMessage(`Synced ${count} exams for the mobile app.`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sync exam data.')
    } finally {
      setSyncingSummaries(false)
    }
  }
  async function publishTopicExam(examId: string) {
    if (!canEdit) return
    try {
      await publishExam(examId)
      setTopicExams((current) =>
        current.map((exam) => (exam.id === examId ? { ...exam, status: 'published' } : exam)),
      )
      setReviewingExam((current) =>
        current && current.id === examId ? { ...current, status: 'published' } : current,
      )
      setMessage('Exam published.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish exam.')
    }
  }
  async function updateExamQuestion(exam: Exam, index: number, updated: ExamQuestion) {
    const questions = (exam.questions || []).map((question, questionIndex) =>
      questionIndex === index ? updated : question,
    )
    try {
      await updateExamQuestions(exam.id, questions)
      setTopicExams((current) =>
        current.map((item) => (item.id === exam.id ? { ...item, questions } : item)),
      )
      setReviewingExam((current) =>
        current && current.id === exam.id ? { ...current, questions } : current,
      )
      setMessage('Question updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update question.')
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
  function renderQuestionCards(
    questions: ExamQuestion[],
    onSave: (index: number, updated: ExamQuestion) => void,
  ) {
    return (
      <div className="question-cards">
        {questions.map((question, index) => {
          if (editingIndex === index && editDraft)
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
                        onSave(index, editDraft)
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
              onEdit={() => startEditQuestion(index, question)}
            />
          )
        })}
      </div>
    )
  }
  async function deleteItem(item: Subject) {
    if (!canEdit) return
    try {
      await deleteSubjectTree(items, item.id)
      setSelectedItemId('')
      setViewItemId('')
      setMessage('Subject item deleted.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete subject item.')
    }
  }
  async function clearSubjects() {
    if (!canEdit || seeding || clearing) return
    if (items.length === 0) {
      setMessage('No subjects to remove.')
      return
    }
    if (
      !window.confirm(
        `Delete all ${items.length} subject/topic/subtopic items and every exam linked to them? This cannot be undone.`,
      )
    )
      return
    setClearing(true)
    try {
      const removed = await clearAllSubjects(items)
      setSelectedItemId('')
      setViewItemId('')
      setMessage(`Removed ${removed} items.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to remove subjects.')
    } finally {
      setClearing(false)
    }
  }
  async function applySeedSubjects() {
    if (!canEdit || seeding || clearing) return
    const existingNames = new Set(childrenOf(null).map((item) => item.name.toLowerCase()))
    const toCreate = SEED_SUBJECTS.filter(
      (subject) => !existingNames.has(subject.name.toLowerCase()),
    )
    if (toCreate.length === 0) {
      setMessage('All seed subjects already exist.')
      return
    }
    if (
      !window.confirm(
        `Create ${toCreate.length} competitive-exam subjects with their topics and subtopics?`,
      )
    )
      return
    setSeeding(true)
    try {
      const created = await seedSubjects(toCreate, childrenOf(null).length)
      setMessage(`Seeded ${created} subject/topic/subtopic items.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to seed subjects.')
    } finally {
      setSeeding(false)
    }
  }
  function renderTree(parent: string | null, depth = 0): ReactNode {
    const siblings = childrenOf(parent)
    return siblings.map((item) => {
      const childCount = childrenOf(item.id).length
      const hasChildren = childCount > 0
      const expanded = expandedIds.has(item.id)
      return (
        <div key={item.id} className="subject-tree-item" style={{ marginLeft: depth * 20 }}>
          <div
            className={`organizer-item ${selectedItemId === item.id ? 'selected-subject' : ''}`}
            onClick={(event) => {
              event.stopPropagation()
              setSelectedItemId(item.id)
            }}
          >
            <span className="subject-name">
              {hasChildren ? (
                <button
                  className="caret-button"
                  title={expanded ? 'Collapse' : 'Expand'}
                  onClick={(event) => {
                    event.stopPropagation()
                    setExpandedIds((current) => {
                      const next = new Set(current)
                      if (next.has(item.id)) next.delete(item.id)
                      else next.add(item.id)
                      return next
                    })
                  }}
                >
                  {expanded ? '⌄' : '›'}
                </button>
              ) : (
                <span className="caret-placeholder" />
              )}
              <span
                className={`tree-icon ${hasChildren ? `folder${expanded ? ' open' : ''}` : 'leaf'}`}
              />
              {item.name}
              {hasChildren && <span className="tree-count">{childCount}</span>}
            </span>
          </div>
          {expanded && renderTree(item.id, depth + 1)}
        </div>
      )
    })
  }
  const viewedItem = items.find((item) => item.id === viewItemId)
  const viewedParent = viewedItem?.parentId
    ? items.find((item) => item.id === viewedItem.parentId)
    : undefined
  const showTree = !createView && !viewItemId
  return (
    <div className="stack" onClick={() => setActionOpen(false)}>
      <div className="card">
        {showTree && (
          <div className="subject-heading">
            <div>
              <h3>
                <span className="heading-icon">▦</span>Subjects
              </h3>
              <p>Create and organize subjects, topics, and exams.</p>
            </div>
            <div className="subject-header-actions" onClick={(event) => event.stopPropagation()}>
              {canEdit && <button onClick={() => openCreateView('subject')}>+ New subject</button>}
              <div className="subject-action-menu">
                <button
                  className="secondary more-button"
                  onClick={() => setActionOpen((open) => !open)}
                  aria-expanded={actionOpen}
                  aria-label="More actions"
                  title="More actions"
                >
                  ⋯
                </button>
                {actionOpen && (
                  <div className="dropdown">
                    {canEdit && (
                      <>
                        <button
                          disabled={!selectedItemId}
                          onClick={() => openCreateView('topic', selectedItemId)}
                        >
                          Create topic
                        </button>
                        <button
                          disabled={seeding || clearing}
                          onClick={() => {
                            setActionOpen(false)
                            void applySeedSubjects()
                          }}
                        >
                          {seeding ? 'Seeding…' : 'Seed exam subjects'}
                        </button>
                        <button
                          disabled={syncingSummaries}
                          onClick={() => {
                            setActionOpen(false)
                            void syncExams()
                          }}
                          title="Recreate examQuestions from every exam, so the mobile app's Tests list/take-test flow includes exams created before this feature existed"
                        >
                          {syncingSummaries ? 'Syncing…' : 'Sync exam data for mobile'}
                        </button>
                        <button
                          disabled={seeding || clearing || items.length === 0}
                          className="delete-action"
                          onClick={() => {
                            setActionOpen(false)
                            void clearSubjects()
                          }}
                        >
                          {clearing ? 'Removing…' : 'Clear all subjects'}
                        </button>
                      </>
                    )}
                    <button
                      disabled={!selectedItemId}
                      onClick={() => {
                        setViewItemId(selectedItemId)
                        setCreateView(null)
                        setActionOpen(false)
                      }}
                    >
                      View
                    </button>
                    {canEdit && (
                      <button
                        disabled={!selectedItemId}
                        className="delete-action"
                        onClick={() => {
                          const item = items.find((candidate) => candidate.id === selectedItemId)
                          setActionOpen(false)
                          if (item) void deleteItem(item)
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {!canEdit && showTree && (
          <p className="notice">
            Admin access is read-only. Only Super Admins can create subject items.
          </p>
        )}

        {createView === 'subject' && (
          <form className="form create-metadata-form" onSubmit={createItem}>
            <div className="form-header">
              <h3>Create subject</h3>
              <p>
                Add a new top-level subject. Topics and subtopics are added under it afterwards.
              </p>
            </div>
            <label>
              Name
              <input required value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includeMixed}
                onChange={(event) => setIncludeMixed(event.target.checked)}
              />
              Create Mixed section as a subtopic
            </label>
            <div className="row">
              <button
                className="back-link"
                type="button"
                onClick={resetCreateForm}
                aria-label="Cancel"
                title="Cancel"
              >
                ←
              </button>
              <button type="submit">Create subject</button>
            </div>
            {message && <p className="notice">{message}</p>}
          </form>
        )}

        {createView === 'topic' && (
          <form className="form create-metadata-form" onSubmit={createTopic}>
            <div className="form-header">
              <h3>Create topic</h3>
              <p>
                Add a topic under{' '}
                <strong>
                  {items.find((item) => item.id === topicParentId)?.name || 'this subject'}
                </strong>
                .
              </p>
            </div>
            <label>
              Name
              <input required value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="checkbox">
              <input
                type="checkbox"
                checked={includeMixed}
                onChange={(event) => setIncludeMixed(event.target.checked)}
              />
              Create Mixed section as a subtopic
            </label>
            <div className="row">
              <button
                className="back-link"
                type="button"
                onClick={resetCreateForm}
                aria-label="Back"
                title="Back"
              >
                ←
              </button>
              <button type="submit">Create topic</button>
            </div>
            {message && <p className="notice">{message}</p>}
          </form>
        )}

        {createView === 'exam' && examStep === 'upload' && (
          <div className="form create-metadata-form">
            <div className="form-header">
              <h3>Create exam</h3>
              <p>
                Upload a questions CSV for{' '}
                <strong>
                  {items.find((item) => item.id === topicParentId)?.name || 'this topic'}
                </strong>
                , then review it.
              </p>
            </div>
            <label>
              Exam Name
              <input
                required
                value={examName}
                onChange={(event) => setExamName(event.target.value)}
              />
            </label>
            <label>
              Description
              <textarea
                value={examDescription}
                onChange={(event) => setExamDescription(event.target.value)}
              />
            </label>
            <div className="form-header">
              <h3>Timer</h3>
            </div>
            <div className="row">
              <label className="checkbox">
                <input
                  type="radio"
                  name="timerEnabled"
                  checked={!timerEnabled}
                  onChange={() => setTimerEnabled(false)}
                />{' '}
                No timer
              </label>
              <label className="checkbox">
                <input
                  type="radio"
                  name="timerEnabled"
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
                      name="timerType"
                      checked={timerType === 'perQuestion'}
                      onChange={() => setTimerType('perQuestion')}
                    />{' '}
                    Per question
                  </label>
                  <label className="checkbox">
                    <input
                      type="radio"
                      name="timerType"
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
                    onChange={(event) => setTimerMinutes(event.target.value)}
                  />
                </label>
              </>
            )}
            <div className="csv-upload-wrap">
              <label
                className={`csv-dropzone ${dragActive ? 'drag-active' : ''} ${examFile ? 'has-file' : ''}`}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragActive(false)
                  const file = event.dataTransfer.files?.[0]
                  if (file) handleExamFile(file)
                }}
              >
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(event) => handleExamFile(event.target.files?.[0] || null)}
                />
                <span className="csv-icon">↑</span>
                {examFile ? (
                  <span className="csv-filename">{examFile.name}</span>
                ) : (
                  <>
                    <span className="csv-title">Click to upload or drag & drop</span>
                    <span className="csv-hint">.csv file with your exam questions</span>
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
                <summary>Expected columns</summary>
                <p>
                  question, optionA, optionB, optionC, optionD, correctAnswer (A/B/C/D), explanation
                  (optional)
                </p>
              </details>
            </div>
            <div className="row">
              <button
                className="back-link"
                type="button"
                onClick={resetCreateForm}
                aria-label="Cancel"
                title="Cancel"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => void reviewExamQuestions()}
                disabled={!examName.trim() || !examFile}
              >
                Review
              </button>
            </div>
            {message && <p className="notice">{message}</p>}
          </div>
        )}

        {createView === 'exam' && examStep === 'review' && (
          <div className="exam-review">
            <div className="form-header">
              <h3>Review questions</h3>
              <p>
                {examQuestions.length} question{examQuestions.length === 1 ? '' : 's'} parsed from{' '}
                <strong>{examFile?.name}</strong>. Check them, then submit.
              </p>
            </div>
            {renderQuestionCards(examQuestions, (index, updated) =>
              setExamQuestions((current) =>
                current.map((question, questionIndex) =>
                  questionIndex === index ? updated : question,
                ),
              ),
            )}
            <button className="medium-button" onClick={() => void submitExam()}>
              Submit
            </button>
            {message && <p className="notice">{message}</p>}
          </div>
        )}

        {viewItemId && viewedItem && !createView && reviewingExam && (
          <div className="metadata-view">
            <BackHeading
              title={reviewingExam.name}
              onBack={() => {
                setReviewingExam(null)
                cancelEditQuestion()
              }}
              label="Back to exams"
            />
            <p className="description">{reviewingExam.description || 'No description provided.'}</p>
            <div className="meta-chips">
              <StatusPill status={reviewingExam.status} />
              <span className="meta-chip">{reviewingExam.questions?.length ?? 0} questions</span>
            </div>
            {renderQuestionCards(
              reviewingExam.questions || [],
              (index, updated) => void updateExamQuestion(reviewingExam, index, updated),
            )}
            {canEdit && reviewingExam.status !== 'published' && (
              <button
                className="medium-button"
                onClick={() => void publishTopicExam(reviewingExam.id)}
              >
                Publish
              </button>
            )}
            {message && <p className="notice">{message}</p>}
          </div>
        )}

        {viewItemId && viewedItem && !createView && !reviewingExam && (
          <div className="metadata-view">
            <BackHeading
              title={viewedItem.name}
              onBack={() => setViewItemId('')}
              label="Back to subjects"
            />
            <p className="description">{viewedItem.description || 'No description provided.'}</p>
            <div className="meta-chips">
              <span className="meta-chip">{viewedItem.type || 'subject'}</span>
              <span className="meta-chip">{viewedItem.status || 'active'}</span>
              {viewedParent && <span className="meta-chip">Under {viewedParent.name}</span>}
            </div>
            {(viewedItem.type === 'topic' || viewedItem.type === 'subtopic') && (
              <div className="exams-section">
                <h3>Exams</h3>
                {topicExamsLoading && <p>Loading exams…</p>}
                {!topicExamsLoading && topicExams.length === 0 && (
                  <p>No exams created for this topic yet.</p>
                )}
                {!topicExamsLoading && topicExams.length > 0 && (
                  <div className="exam-tiles">
                    {topicExams.map((exam) => (
                      <div className="exam-tile" key={exam.id}>
                        <div className="exam-tile-info">
                          <p className="exam-tile-name">{exam.name}</p>
                          <p className="exam-tile-meta">
                            {exam.questions?.length ?? 0} questions ·{' '}
                            <StatusPill status={exam.status} />
                          </p>
                        </div>
                        <div className="exam-tile-actions">
                          <IconButton
                            icon="⟳"
                            label="Review questions"
                            onClick={() => {
                              setReviewingExam(exam)
                              cancelEditQuestion()
                            }}
                          />
                          {canEdit && exam.status !== 'published' && (
                            <button
                              className="small-button"
                              onClick={() => void publishTopicExam(exam.id)}
                            >
                              Publish
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {(viewedItem.type === 'topic' || viewedItem.type === 'subtopic') && (
              <button
                className="medium-button"
                onClick={() => openCreateView('exam', viewedItem.id)}
              >
                + Create exam
              </button>
            )}
            {message && <p className="notice">{message}</p>}
          </div>
        )}
      </div>
      {showTree && (
        <div className="card subject-tree" onClick={() => setSelectedItemId('')}>
          {renderTree(null)}
          {childrenOf(null).length === 0 && <p>No subjects created yet.</p>}
        </div>
      )}
    </div>
  )
}
