import { useEffect, useState, type FormEvent } from 'react'
import './subjects.css'
import type { Exam, ExamQuestion, Subject } from '../../core/types'
import {
  createSubjectItem,
  deleteSubjectTree,
  listExamsForTopic,
  listSubjects,
  publishExam,
  updateExamQuestions,
} from '../../services/subjects'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { ExamCreator } from '../shared/ExamCreator'
import { ExamDetails } from '../shared/ExamDetails'
import { StatusPill } from '../shared/StatusPill'

export function Subjects({ role }: { role: 'admin' | 'superAdmin' }) {
  const [items, setItems] = useState<Subject[]>([])
  const [pathIds, setPathIds] = useState<string[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [includeMixed, setIncludeMixed] = useState(false)
  const [createView, setCreateView] = useState<'item' | 'exam' | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [selectedExamIds, setSelectedExamIds] = useState<Set<string>>(new Set())
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false)
  const [gearOpen, setGearOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [topicExams, setTopicExams] = useState<Exam[]>([])
  const [topicExamsLoading, setTopicExamsLoading] = useState(false)
  const [reviewingExam, setReviewingExam] = useState<Exam | null>(null)
  const canEdit = role === 'superAdmin'

  const load = async () => {
    setItems(await listSubjects())
  }
  useEffect(() => {
    void load().catch((error) =>
      setMessage(error instanceof Error ? error.message : 'Unable to load subjects.'),
    )
  }, [])

  const currentFolderId = pathIds[pathIds.length - 1] || null
  const currentItem = items.find((item) => item.id === currentFolderId)
  // Full folder path for labels (e.g. "Science › Physics › Mechanics"),
  // matching the breadcrumb above.
  const currentPathLabel = pathIds
    .map((id) => items.find((item) => item.id === id)?.name)
    .filter((name): name is string => Boolean(name))
    .join(' › ')
  // Any opened folder (subject, topic, or subtopic) can hold exams alongside
  // its child folders — only the root "Subjects" listing (nothing opened) can't.
  const canCreateExamHere = currentFolderId !== null
  const childItemType: 'subject' | 'topic' | 'subtopic' | null =
    currentFolderId === null
      ? 'subject'
      : currentItem?.type === 'subject'
        ? 'topic'
        : currentItem?.type === 'topic'
          ? 'subtopic'
          : null
  const childItemLabel = childItemType || 'item'

  useEffect(() => {
    if (!canCreateExamHere || !currentFolderId) {
      setTopicExams([])
      return
    }
    setTopicExamsLoading(true)
    listExamsForTopic(currentFolderId)
      .then(setTopicExams)
      .catch(() => setMessage('Unable to load exams for this topic.'))
      .finally(() => setTopicExamsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolderId, items])

  useEffect(() => {
    if (currentFolderId && items.length > 0 && !items.some((item) => item.id === currentFolderId)) {
      setPathIds((current) => current.slice(0, -1))
    }
  }, [items, currentFolderId])

  useEffect(() => {
    setSelectedIds(new Set())
    setSelectedExamIds(new Set())
  }, [currentFolderId])

  function toggleSelectedExam(id: string) {
    setSelectedExamIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleSelected(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const childrenOf = (id: string | null) =>
    items
      .filter((item) => (item.parentId || null) === id && (id !== null || item.type !== 'mixed'))
      .sort((a, b) => (a.order || 0) - (b.order || 0))
  const children = childrenOf(currentFolderId)

  function openFolder(id: string) {
    setCreateView(null)
    setReviewingExam(null)
    setPathIds((current) => [...current, id])
  }
  function goToBreadcrumb(index: number) {
    setPathIds((current) => current.slice(0, index + 1))
  }
  function resetCreateForm() {
    setName('')
    setDescription('')
    setStatus('active')
    setIncludeMixed(false)
    setCreateView(null)
  }
  function openCreateView(view: 'item' | 'exam') {
    resetCreateForm()
    setCreateView(view)
  }

  async function createChildItem(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !name.trim() || !childItemType) return
    try {
      await createSubjectItem({
        name,
        description,
        parentId: currentFolderId,
        type: childItemType,
        status,
        order: children.length,
        includeMixed,
      })
      resetCreateForm()
      setMessage(`${childItemLabel[0].toUpperCase()}${childItemLabel.slice(1)} created.`)
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : `Unable to create ${childItemLabel}.`)
    }
  }
  async function handleExamCreated() {
    resetCreateForm()
    setMessage('Exam saved as a draft.')
    await load()
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
  async function confirmBulkDelete() {
    if (!canEdit || selectedIds.size === 0) return
    try {
      for (const id of selectedIds) {
        await deleteSubjectTree(items, id)
      }
      setConfirmingBulkDelete(false)
      setSelectedIds(new Set())
      setMessage('Deleted.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete.')
      setConfirmingBulkDelete(false)
    }
  }

  const showGrid = !createView && !reviewingExam
  return (
    <div className="stack" onClick={() => setGearOpen(false)}>
      <div className="card">
        {confirmingBulkDelete && (
          <ConfirmDialog
            title={`Delete ${selectedIds.size} item${selectedIds.size === 1 ? '' : 's'}?`}
            danger
            confirmLabel="Delete"
            message="This deletes the selected folders and everything inside them (topics and subtopics). This can't be undone."
            onCancel={() => setConfirmingBulkDelete(false)}
            onConfirm={() => void confirmBulkDelete()}
          />
        )}

        {showGrid && (
          <>
            {!canEdit && (
              <p className="notice">
                Admin access is read-only. Only Super Admins can create subject items.
              </p>
            )}
            <div className="subject-top-row">
              <div className="breadcrumb">
                <button
                  className="breadcrumb-item"
                  disabled={pathIds.length === 0}
                  onClick={() => setPathIds([])}
                >
                  Subjects
                </button>
                {pathIds.map((id, index) => {
                  const item = items.find((candidate) => candidate.id === id)
                  if (!item) return null
                  const isLast = index === pathIds.length - 1
                  return (
                    <span key={id} className="breadcrumb-segment">
                      <span className="breadcrumb-sep">/</span>
                      {isLast ? (
                        <span className="breadcrumb-current">{item.name}</span>
                      ) : (
                        <button className="breadcrumb-item" onClick={() => goToBreadcrumb(index)}>
                          {item.name}
                        </button>
                      )}
                    </span>
                  )
                })}
              </div>
              {canEdit && (
                <div className="subject-top-actions">
                  <div className="subject-menu">
                    <button
                      type="button"
                      className="secondary gear-button"
                      onClick={(event) => {
                        event.stopPropagation()
                        setGearOpen((open) => !open)
                      }}
                      aria-expanded={gearOpen}
                      aria-label="More actions"
                      title="More actions"
                    >
                      ⚙
                    </button>
                    {gearOpen && (
                      <div className="dropdown" onClick={(event) => event.stopPropagation()}>
                        <button
                          disabled={!canCreateExamHere || selectedIds.size > 0 || selectedExamIds.size > 0}
                          onClick={() => {
                            setGearOpen(false)
                            openCreateView('exam')
                          }}
                        >
                          + Create exam
                        </button>
                        <button
                          disabled={selectedExamIds.size !== 1}
                          onClick={() => {
                            const exam = topicExams.find((candidate) =>
                              selectedExamIds.has(candidate.id),
                            )
                            setGearOpen(false)
                            setSelectedExamIds(new Set())
                            if (exam) {
                              setReviewingExam(exam)
                            }
                          }}
                        >
                          Edit
                        </button>
                        <button
                          disabled={selectedIds.size === 0}
                          onClick={() => {
                            setGearOpen(false)
                            setConfirmingBulkDelete(true)
                          }}
                        >
                          Delete{selectedIds.size > 0 ? ` (${selectedIds.size})` : ''}
                        </button>
                      </div>
                    )}
                  </div>
                  {childItemType && (
                    <button onClick={() => openCreateView('item')}>+ New</button>
                  )}
                </div>
              )}
            </div>
            {currentItem?.description && <p className="folder-description">{currentItem.description}</p>}
            <div className="folder-grid">
              {children.map((item) => {
                const count = childrenOf(item.id).length
                const selected = selectedIds.has(item.id)
                return (
                  <div
                    key={item.id}
                    className={`folder-card ${selected ? 'selected' : ''}`}
                    onClick={() => (selectedIds.size > 0 ? toggleSelected(item.id) : openFolder(item.id))}
                  >
                    {canEdit && (
                      <label
                        className="folder-card-checkbox"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelected(item.id)}
                          aria-label={`Select ${item.name}`}
                        />
                      </label>
                    )}
                    <span className="folder-card-icon" />
                    <p className="folder-card-name">{item.name}</p>
                    <span className="folder-card-count">
                      {count} item{count === 1 ? '' : 's'}
                    </span>
                  </div>
                )
              })}
            </div>
            {children.length === 0 && !canCreateExamHere && (
              <p className="folder-grid-empty">This folder is empty.</p>
            )}
            {canCreateExamHere && (
              <div className="exam-list">
                {topicExamsLoading && <p className="folder-grid-empty">Loading exams…</p>}
                {!topicExamsLoading && topicExams.length === 0 && (
                  <p className="folder-grid-empty">
                    {children.length === 0 ? 'This folder is empty.' : 'No exams here yet.'}
                  </p>
                )}
                {topicExams.map((exam) => {
                  const examSelected = selectedExamIds.has(exam.id)
                  return (
                    <div
                      key={exam.id}
                      className={`exam-list-row ${examSelected ? 'selected' : ''}`}
                      onClick={() => {
                        if (selectedExamIds.size > 0) {
                          toggleSelectedExam(exam.id)
                          return
                        }
                        setReviewingExam(exam)
                      }}
                    >
                      {canEdit && (
                        <label
                          className="exam-list-checkbox"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={examSelected}
                            onChange={() => toggleSelectedExam(exam.id)}
                            aria-label={`Select ${exam.name}`}
                          />
                        </label>
                      )}
                      <span className="exam-list-name">{exam.name}</span>
                      <span className="exam-list-meta">
                        {exam.questions?.length ?? 0} question{(exam.questions?.length ?? 0) === 1 ? '' : 's'}
                      </span>
                      <StatusPill status={exam.status} />
                    </div>
                  )
                })}
              </div>
            )}
            {message && <p className="notice">{message}</p>}
          </>
        )}

        {createView === 'item' && (
          <form className="form create-metadata-form" onSubmit={createChildItem}>
            <div className="form-header">
              <h3>Create {childItemLabel}</h3>
              <p>
                {childItemType === 'subject' ? (
                  'Add a new top-level subject. Topics and subtopics are added under it afterwards.'
                ) : (
                  <>
                    Add a {childItemLabel} under <strong>{currentItem?.name}</strong>.
                  </>
                )}
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
              <button type="submit">Create {childItemLabel}</button>
            </div>
            {message && <p className="notice">{message}</p>}
          </form>
        )}

        {createView === 'exam' && currentFolderId && (
          <ExamCreator
            topicId={currentFolderId}
            fixedLabel={currentPathLabel || 'this topic'}
            statusMode="draft"
            onCreated={() => void handleExamCreated()}
            onCancel={() => setCreateView(null)}
          />
        )}

        {reviewingExam && (
          <ExamDetails
            exam={reviewingExam}
            backLabel="Back to folder"
            canEdit={canEdit}
            message={message}
            onBack={() => setReviewingExam(null)}
            onUpdateQuestion={(index, updated) =>
              void updateExamQuestion(reviewingExam, index, updated)
            }
            onPublish={() => void publishTopicExam(reviewingExam.id)}
          />
        )}
      </div>
    </div>
  )
}
