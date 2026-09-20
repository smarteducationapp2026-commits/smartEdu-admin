import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { Exam, ExamQuestion, PublicExam } from '../../core/types'
import { getExam, publishExam, updateExamQuestions } from '../../services/subjects'
import { BackHeading } from '../shared/BackHeading'
import { ExamCreator } from '../shared/ExamCreator'
import { ExamDetails } from '../shared/ExamDetails'
import { SearchInput } from '../shared/SearchInput'
import { StatusPill } from '../shared/StatusPill'
import type { FormState } from './formState'
import { SeriesCover } from './SeriesCover'

type Timestamp = { seconds?: number }

export function TestSeriesForm({
  form,
  setForm,
  exams,
  topicNames,
  examSearch,
  setExamSearch,
  editingId,
  saving,
  message,
  canEdit,
  testsDirty,
  detailsDirty,
  savedTestCount,
  savedExamIds,
  updatedAt,
  publishedAt,
  onBack,
  onSubmit,
  onPublish,
  onDelete,
  onToggleExam,
  onExamCreated,
  onDetachExam,
  onDeleteExam,
  addedIds,
  onSaveTests,
  countSeriesUsing,
  onExamChanged,
}: {
  form: FormState
  setForm: (form: FormState) => void
  exams: PublicExam[]
  topicNames: Record<string, string>
  examSearch: string
  setExamSearch: (value: string) => void
  editingId: string | null
  saving: boolean
  message: string
  canEdit: boolean
  testsDirty: boolean
  detailsDirty: boolean
  savedTestCount: number
  savedExamIds: string[]
  updatedAt?: Timestamp
  publishedAt?: Timestamp
  onBack: () => void
  onSubmit: (event: FormEvent) => void
  onPublish: () => Promise<boolean>
  onDelete: (deleteTests: boolean) => void
  onToggleExam: (examId: string) => void
  onExamCreated: (examId: string) => void
  onDetachExam: (examId: string) => void
  onDeleteExam: (exam: PublicExam) => void
  addedIds: Set<string>
  onSaveTests: () => Promise<boolean>
  countSeriesUsing: (examId: string) => number
  onExamChanged: () => void
}) {
  const [creatingTest, setCreatingTest] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [deleteTestsToo, setDeleteTestsToo] = useState(false)
  const [removingExam, setRemovingExam] = useState<PublicExam | null>(null)
  const [confirmingBack, setConfirmingBack] = useState(false)
  // Review opens a large modal with the full details + Publish inside it.
  const [reviewing, setReviewing] = useState(false)
  const [viewingExam, setViewingExam] = useState<Exam | null>(null)
  const [viewLoading, setViewLoading] = useState(false)
  const [viewError, setViewError] = useState('')
  const [examMessage, setExamMessage] = useState('')
  const testsRef = useRef<HTMLDivElement>(null)
  const hasUnpublishedChanges =
    editingId != null && ((updatedAt?.seconds ?? 0) > (publishedAt?.seconds ?? 0))
  // Guided flow: 1) save series details → 2) add tests → 3) publish.
  // Later sections stay hidden until the previous one is complete.
  // Step advances on SAVED progress: Update moves 2→3, publish completes 3.
  const step = !editingId ? 1 : savedTestCount === 0 || testsDirty ? 2 : 3
  const stepDone = !editingId
    ? 0
    : form.status === 'published' && !hasUnpublishedChanges
      ? 3
      : savedTestCount > 0 && !testsDirty
        ? 2
        : 1
  const showStep2 = editingId != null
  const showStep3 = editingId != null && savedExamIds.length > 0
  // Accordion: follows the current step until the user pins one open.
  // All three headers always render; later steps are locked until unlocked.
  const [pinnedStep, setPinnedStep] = useState<number | null>(null)
  const visibleStep = pinnedStep ?? step
  const toggleStep = (n: number) => {
    if (n === 2 && !showStep2) return
    if (n === 3 && !showStep3) return
    setPinnedStep(visibleStep === n ? 0 : n)
  }
  const topicLabel = (topicId: string) =>
    topicId ? topicNames[topicId] || 'Unknown topic' : 'Series only'
  const selectedExams = form.examIds
    .map((id) => exams.find((exam) => exam.id === id))
    .filter((exam): exam is PublicExam => Boolean(exam))
  // Step 3 reviews what's SAVED — staged step-2 edits stay out until Update.
  const savedSelectedExams = savedExamIds
    .map((id) => exams.find((exam) => exam.id === id))
    .filter((exam): exam is PublicExam => Boolean(exam))
  const searchMatches = examSearch.trim()
    ? exams.filter(
      (exam) =>
        exam.status !== 'published' &&
        !form.examIds.includes(exam.id) &&
        `${exam.name} ${topicNames[exam.topicId] || ''}`
          .toLowerCase()
          .includes(examSearch.toLowerCase()),
    )
    : []
  const coverName = form.title.trim() ? `cover-${form.title.trim().toLowerCase()}` : 'cover-default'
  // Publish is available whenever there is something to publish.
  const canPublish =
    editingId != null &&
    (testsDirty || form.status !== 'published' || hasUnpublishedChanges)

  // Browser reload/close with staged test changes gets a native prompt.
  useEffect(() => {
    if (!testsDirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [testsDirty])

  async function openExamForView(examId: string) {
    setViewLoading(true)
    setViewError('')
    setExamMessage('')
    try {
      const full = await getExam(examId)
      if (!full) {
        setViewError('That test no longer exists.')
        return
      }
      setViewingExam(full)
    } catch (error) {
      setViewError(error instanceof Error ? error.message : 'Unable to open test.')
    } finally {
      setViewLoading(false)
    }
  }

  async function handleUpdateQuestion(exam: Exam, index: number, updated: ExamQuestion) {
    try {
      const questions = (exam.questions || []).map((question, questionIndex) =>
        questionIndex === index ? updated : question,
      )
      await updateExamQuestions(exam.id, questions)
      setViewingExam({ ...exam, questions })
      setExamMessage('Question updated.')
      onExamChanged()
    } catch (error) {
      setExamMessage(error instanceof Error ? error.message : 'Unable to update question.')
    }
  }

  async function handlePublishExam(examId: string) {
    try {
      await publishExam(examId)
      setViewingExam((current) =>
        current && current.id === examId ? { ...current, status: 'published' } : current,
      )
      setExamMessage('Exam published.')
      onExamChanged()
    } catch (error) {
      setExamMessage(error instanceof Error ? error.message : 'Unable to publish exam.')
    }
  }

  // "+ Create test" opens the shared create-exam page (same component as
  // Subjects uses), showing this series' name like the subject path.
  if (creatingTest && editingId) {
    return (
      <div className="stack">
        <BackHeading
          title={`Create test · ${form.title.trim() || 'Untitled series'}`}
          onBack={() => setCreatingTest(false)}
          label="Back to test series"
        />
        <div className="card">
          <ExamCreator
            topicId=""
            statusMode="draft"
            contextLabel={form.title.trim() || 'Untitled series'}
            onCreated={(examId) => {
              onExamCreated(examId)
              setCreatingTest(false)
            }}
            onCancel={() => setCreatingTest(false)}
          />
        </div>
      </div>
    )
  }

  // Exam viewer: full shared details page for one attached test.
  if (viewingExam) {
    return (
      <div className="stack">
        <ExamDetails
          exam={viewingExam}
          backLabel="Back to test series"
          canEdit={canEdit}
          message={examMessage}
          onBack={() => {
            setViewingExam(null)
            setExamMessage('')
          }}
          onUpdateQuestion={(index, updated) =>
            void handleUpdateQuestion(viewingExam, index, updated)
          }
          onPublish={canEdit ? () => void handlePublishExam(viewingExam.id) : undefined}
        />
      </div>
    )
  }

  return (
    <div className="stack">
      <BackHeading
        title={form.title.trim() || (editingId ? 'Edit test series' : 'New test series')}
        onBack={() => {
          if (testsDirty) setConfirmingBack(true)
          else onBack()
        }}
        label="Back to test series"
      />
      {confirmingBack && (
        <div className="confirm-overlay" onClick={() => setConfirmingBack(false)}>          <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Unsaved test changes</h3>
            <p>Please save the changes before leaving — added or removed tests will be lost otherwise.</p>
            <div className="row confirm-dialog-actions">
              <button type="button" className="secondary" onClick={() => setConfirmingBack(false)}>
                Keep editing
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setConfirmingBack(false)
                  onBack()
                }}
              >
                Discard
              </button>
              <button
                type="button"
                className="medium-button"
                disabled={saving}
                onClick={() => {
                  void (async () => {
                    const ok = await onSaveTests()
                    if (ok) {
                      setConfirmingBack(false)
                      onBack()
                    }
                  })()
                }}
              >
                {saving ? 'Updating…' : 'Update & leave'}
              </button>
            </div>
          </div>
        </div>
      )}
      {removingExam && (
        <RemoveExamDialog
          exam={removingExam}
          topic={topicLabel(removingExam.topicId)}
          otherSeriesCount={countSeriesUsing(removingExam.id)}
          onCancel={() => setRemovingExam(null)}
          onDetach={() => {
            onDetachExam(removingExam.id)
            setRemovingExam(null)
          }}
          onDelete={() => {
            onDeleteExam(removingExam)
            setRemovingExam(null)
          }}
        />
      )}
      <ol className="series-steps">
        <li className={`series-step${step === 1 ? ' active' : ' done'}`}>
          <span className="series-step-dot">{stepDone >= 1 ? '✓' : '1'}</span>
          <span className="series-step-text">
            <strong>Save test series</strong>
            <small>{editingId ? 'Saved' : 'Fill in, then save'}</small>
          </span>
        </li>
        <li className={`series-step${step === 2 ? ' active' : stepDone >= 2 ? ' done' : ''}`}>
          <span className="series-step-dot">{stepDone >= 2 ? '✓' : '2'}</span>
          <span className="series-step-text">
            <strong>Add tests</strong>
            <small>Create new or attach existing</small>
          </span>
        </li>
        <li className={`series-step${step === 3 && stepDone < 3 ? ' active' : stepDone >= 3 ? ' done' : ''}`}>
          <span className="series-step-dot">{stepDone >= 3 ? '✓' : '3'}</span>
          <span className="series-step-text">
            <strong>Publish</strong>
            <small>Needs at least 1 test</small>
          </span>
        </li>
      </ol>
      {confirmingDelete && (
        <div className="confirm-overlay" onClick={() => setConfirmingDelete(false)}>
          <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this test series?</h3>
            <p>
              {form.status === 'published'
                ? 'This test series is published and visible to students right now. Deleting it removes it immediately, and this can’t be undone.'
                : 'This test series is only saved as a draft and hasn’t been published. Delete it anyway? This can’t be undone.'}
            </p>
            {form.examIds.length > 0 && (
              <label className="checkbox confirm-dialog-check">
                <input
                  type="checkbox"
                  checked={deleteTestsToo}
                  onChange={(e) => setDeleteTestsToo(e.target.checked)}
                />{' '}
                Also delete the {form.examIds.length} attached test{form.examIds.length === 1 ? '' : 's'} permanently
              </label>
            )}
            <div className="row confirm-dialog-actions">
              <button type="button" className="secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="danger-button"
                onClick={() => {
                  setConfirmingDelete(false)
                  setDeleteTestsToo(false)
                  onDelete(deleteTestsToo)
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <form id="test-series-form" className="stack" onSubmit={onSubmit}>
        <div className="card form series-step-card">
          <div className="series-step-head">
            <button
              type="button"
              className="series-card-toggle series-step-head-toggle"
              onClick={() => toggleStep(1)}
              aria-expanded={visibleStep === 1}
            >
              <span className="series-card-toggle-text">
                <span className="series-card-title">Step 1</span>
              </span>
            </button>
            <div className="series-card-actions series-step-head-actions">
              <button
                type="submit"
                className="medium-button"
                disabled={saving || (editingId != null && (!detailsDirty || testsDirty))}
                title={
                  editingId != null && testsDirty
                    ? 'Update step 2 first'
                    : editingId != null && !detailsDirty
                      ? 'No detail changes to save'
                      : undefined
                }
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="medium-button secondary"
                disabled={!editingId}
                title={!editingId ? 'Save the series first' : undefined}
                onClick={() => setConfirmingDelete(true)}
              >
                Delete
              </button>
            </div>
            <button
              type="button"
              className="series-card-chevron-btn"
              onClick={() => toggleStep(1)}
              aria-expanded={visibleStep === 1}
              aria-label={visibleStep === 1 ? 'Collapse step 1' : 'Expand step 1'}
            >
              <span className={`series-card-chevron${editingId ? ' done' : ''}`}>{visibleStep === 1 ? '▾' : '▸'}</span>
            </button>
          </div>
          <p className="series-card-explainer">Enter the title, price and cover, then save to unlock step 2.</p>
          {visibleStep === 1 && (
            <div className="series-card-body">
              <div className="series-cover-row">
                <div className="cover-wrap series-cover-half">
                  <SeriesCover key={coverName} title={form.title} className="test-series-cover-preview" />
                  <span
                    className={`status-dot status-dot-${form.status}`}
                    title={form.status === 'published' ? 'Published' : 'Draft'}
                  />
                </div>
                <div className="series-cover-side">
                  <div className="series-stacked">
                    <span className="series-stacked-label">
                      Title <span className="required-mark">*</span>
                    </span>
                    <input
                      className="shadow-input"
                      required
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                    />
                  </div>
                  <div className="series-stacked">
                    <span className="series-stacked-label">Price</span>
                    <div className="pricing-toggle" role="group" aria-label="Pricing">
                      <button
                        type="button"
                        className={`pricing-toggle-option${form.pricingType === 'free' ? ' active' : ''}`}
                        aria-pressed={form.pricingType === 'free'}
                        onClick={() => setForm({ ...form, pricingType: 'free' })}
                      >
                        Free
                      </button>
                      <button
                        type="button"
                        className={`pricing-toggle-option${form.pricingType === 'paid' ? ' active' : ''}`}
                        aria-pressed={form.pricingType === 'paid'}
                        onClick={() => setForm({ ...form, pricingType: 'paid' })}
                      >
                        Paid
                      </button>
                    </div>
                    {form.pricingType === 'paid' && (
                      <input
                        className="shadow-input series-price-input"
                        type="number"
                        min="1"
                        step="1"
                        required
                        placeholder="₹"
                        value={form.price}
                        onChange={(e) => setForm({ ...form, price: e.target.value })}
                      />
                    )}
                  </div>
                </div>
              </div>
              <div className="series-field series-field-top">
                <span className="series-field-label">Description</span>
                <textarea
                  className="shadow-input"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>
        <div className="card series-step-card" ref={testsRef}>
          <div className="series-step-head">
            <button
              type="button"
              className="series-card-toggle series-step-head-toggle"
              onClick={() => toggleStep(2)}
              aria-expanded={showStep2 && visibleStep === 2}
              disabled={!showStep2}
              title={!showStep2 ? 'Save the series to unlock this step' : undefined}
            >
              <span className="series-card-toggle-text">
                <span className="series-card-title">Step 2</span>

              </span>
            </button>
            <div className="series-card-actions series-step-head-actions">
              <button
                type="button"
                className="medium-button"
                disabled={!testsDirty || saving}
                title={!testsDirty ? 'No test changes to update' : undefined}
                onClick={() => void onSaveTests()}
              >
                {saving ? 'Updating…' : 'Update'}
              </button>
            </div>
            <button
              type="button"
              className="series-card-chevron-btn"
              onClick={() => toggleStep(2)}
              aria-expanded={showStep2 && visibleStep === 2}
              aria-label={visibleStep === 2 ? 'Collapse step 2' : 'Expand step 2'}
            >
              {showStep2 ? (
                <span className={`series-card-chevron${form.examIds.length > 0 ? ' done' : ''}`}>{visibleStep === 2 ? '▾' : '▸'}</span>
              ) : (
                <span className="series-card-locked">Locked</span>
              )}
            </button>
          </div>
          {showStep2 && visibleStep === 2 && (
            <div className="series-card-body">
              <div className="test-options">
                <div className="test-option">
                  <span className="test-option-badge">A</span>
                  <div className="test-option-body">
                    <strong>Create a new test</strong>
                    <p>
                      Upload a questions file and review it on the create-test page. The test is
                      saved as a draft and added to this series automatically — it publishes
                      with the series.
                    </p>
                    <button
                      type="button"
                      className="small-button secondary"
                      disabled={!canEdit}
                      title={!canEdit ? 'Only Super Admins can add tests' : undefined}
                      onClick={() => setCreatingTest(true)}
                    >
                      + Create test
                    </button>
                  </div>
                </div>
                <div className="test-option">
                  <span className="test-option-badge">B</span>
                  <div className="test-option-body">
                    <strong>Attach an existing test</strong>
                    <p>
                      Search draft tests by name or topic and attach them below. Published
                      tests go live through Subjects, so only drafts are listed here — they
                      publish automatically with the series.
                    </p>
                  </div>
                </div>
              </div>

              <div className="exam-picker">
                <SearchInput
                  value={examSearch}
                  onChange={setExamSearch}
                  placeholder="Search draft tests by name or topic to attach…"
                />
                {examSearch.trim() && (
                  <div className="exam-picker-dropdown">
                    {searchMatches.length === 0 && (
                      <p className="exam-picker-empty">
                        No matching draft tests found. Create one with option A above.
                      </p>
                    )}
                    {searchMatches.map((exam) => (
                      <div key={exam.id} className="exam-picker-option">
                        <span className="exam-picker-option-info">
                          <span>
                            {exam.name}{' '}
                            <small>
                              ({topicLabel(exam.topicId)} · {exam.questionCount}{' '}
                              questions)
                            </small>
                          </span>
                          <StatusPill status={exam.status} />
                        </span>
                        <button
                          type="button"
                          className="small-button"
                          onClick={() => onToggleExam(exam.id)}
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="card table-wrap">
                <p className="exam-picker-list-title">Added tests ({form.examIds.length})</p>
                {selectedExams.length === 0 && (
                  <p>No tests yet. Create one with option A, or attach one with option B.</p>
                )}
                {selectedExams.length > 0 && (
                  <div className="exam-table">
                    <div className="exam-table-row exam-table-head">
                      <span>Test</span>
                      <span>Topic</span>
                      <span>Questions</span>
                      <span>Status</span>
                    </div>
                    {selectedExams.map((exam) => (
                      <div key={exam.id} className="exam-table-row">
                        <span className="exam-table-name">{exam.name}</span>
                        <span className="exam-table-meta">{topicLabel(exam.topicId)}</span>
                        <span className="exam-table-meta">{exam.questionCount}</span>
                        <span>
                          <StatusPill status={exam.status} />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {selectedExams.some((exam) => exam.status !== 'published') && (
                  <p className="exam-picker-hint">
                    Draft tests publish automatically when the series is published.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="card series-step-card">
          <div className="series-step-head">
            <button
              type="button"
              className="series-card-toggle series-step-head-toggle"
              onClick={() => toggleStep(3)}
              aria-expanded={showStep3 && visibleStep === 3}
              disabled={!showStep3}
              title={!showStep3 ? 'Add tests and press Update to unlock this step' : undefined}
            >
              <span className="series-card-toggle-text">
                <span className="series-card-title">Step 3</span>
              </span>
            </button>
            <div className="series-card-actions series-step-head-actions">
              <button
                type="button"
                className="medium-button review-ready"
                onClick={() => setReviewing(true)}
              >
                Review
              </button>
            </div>
            <button
              type="button"
              className="series-card-chevron-btn"
              onClick={() => toggleStep(3)}
              aria-expanded={showStep3 && visibleStep === 3}
              aria-label={visibleStep === 3 ? 'Collapse step 3' : 'Expand step 3'}
            >
              {showStep3 ? (
                <span className={`series-card-chevron${form.status === 'published' && !hasUnpublishedChanges ? ' done' : ''}`}>{visibleStep === 3 ? '▾' : '▸'}</span>
              ) : (
                <span className="series-card-locked">Locked</span>
              )}
            </button>
          </div>
          {showStep3 && visibleStep === 3 && (
            <div className="series-card-body">
            <ReviewSummary
              form={form}
              selectedExams={savedSelectedExams}
              topicLabel={topicLabel}
              addedIds={addedIds}
              hasUnpublishedChanges={hasUnpublishedChanges}
              canRemove={canEdit}
              viewLoading={viewLoading}
              onView={(examId) => void openExamForView(examId)}
              onRemove={(exam) => setRemovingExam(exam)}
            />
            {viewError && <p className="notice">{viewError}</p>}
            </div>
          )}
        </div>
        {reviewing && (
          <div className="confirm-overlay" onClick={() => setReviewing(false)}>
            <div className="card confirm-dialog review-modal" onClick={(e) => e.stopPropagation()}>
              <h3>Review & publish</h3>
              <ReviewSummary
                form={form}
                selectedExams={savedSelectedExams}
                topicLabel={topicLabel}
                addedIds={addedIds}
                hasUnpublishedChanges={hasUnpublishedChanges}
                canRemove={canEdit}
                viewLoading={viewLoading}
                onView={(examId) => void openExamForView(examId)}
                onRemove={(exam) => setRemovingExam(exam)}
              />
              {message && <p className="notice">{message}</p>}
              {testsDirty && (
                <p className="notice">
                  You have unsaved test changes — publishing will update them first.
                </p>
              )}
              <div className="row confirm-dialog-actions">
                <button type="button" className="secondary" onClick={() => setReviewing(false)}>
                  Close
                </button>
                <button
                  type="button"
                  className={`medium-button ${canPublish ? 'publish-ready' : 'secondary'}`}
                  disabled={!canPublish}
                  title={!editingId ? 'Save the series first' : undefined}
                  onClick={() => {
                    void (async () => {
                      if (testsDirty) {
                        const savedOk = await onSaveTests()
                        if (!savedOk) return
                      }
                      const ok = await onPublish()
                      if (ok) setReviewing(false)
                    })()
                  }}
                >
                  {testsDirty
                    ? 'Update & publish'
                    : form.status === 'published' && !hasUnpublishedChanges
                      ? 'Published'
                      : 'Publish'}
                </button>
              </div>
            </div>
          </div>
        )}
        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  )
}

function RemoveExamDialog({
  exam,
  topic,
  otherSeriesCount,
  onCancel,
  onDetach,
  onDelete,
}: {
  exam: PublicExam
  topic: string
  otherSeriesCount: number
  onCancel: () => void
  onDetach: () => void
  onDelete: () => void
}) {
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="card confirm-dialog" onClick={(e) => e.stopPropagation()}>
        <h3>Remove “{exam.name}”?</h3>
        <p>
          {exam.topicId
            ? `This test lives under ${topic} — detaching keeps it there.`
            : 'This test lives only in this series — detaching leaves it invisible everywhere.'}{' '}
          {otherSeriesCount > 0 &&
            `It is also used in ${otherSeriesCount} other series${otherSeriesCount === 1 ? '' : 's'}.`}
        </p>
        {otherSeriesCount > 0 && (
          <p>Deleting removes it from every series and deletes it permanently.</p>
        )}
        <div className="row confirm-dialog-actions">
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="secondary" onClick={onDetach}>
            Detach
          </button>
          <button type="button" className="danger-button" onClick={onDelete}>
            Detach & delete test
          </button>
        </div>
      </div>
    </div>
  )
}

function ReviewSummary({
  form,
  selectedExams,
  topicLabel,
  addedIds,
  hasUnpublishedChanges,
  canRemove,
  viewLoading,
  onView,
  onRemove,
}: {
  form: FormState
  selectedExams: PublicExam[]
  topicLabel: (topicId: string) => string
  addedIds: Set<string>
  hasUnpublishedChanges: boolean
  canRemove: boolean
  viewLoading: boolean
  onView: (examId: string) => void
  onRemove: (exam: PublicExam) => void
}) {
  return (
    <>
      <div className="series-review-summary">
        <div className="series-review-row">
          <span>Title</span>
          <strong>{form.title.trim() || '—'}</strong>
        </div>
        <div className="series-review-row">
          <span>Status</span>
          <strong>{form.status === 'published' ? 'Published' : 'Draft'}</strong>
        </div>
        <div className="series-review-row">
          <span>Pricing</span>
          <strong>{form.pricingType === 'paid' ? `Paid · ₹${form.price || 0}` : 'Free'}</strong>
        </div>
        <div className="series-review-row">
          <span>Tests</span>
          <strong>{selectedExams.length}</strong>
        </div>
      </div>
      {selectedExams.length > 0 ? (
        <div className="series-review-list">
          {selectedExams.map((exam, index) => {
            const isNew = addedIds.has(exam.id)
            return (
              <div key={exam.id} className={`series-review-item${isNew ? ' is-new' : ''}`}>
                <span className="series-review-num">{index + 1}</span>
                <span className="series-review-info">
                  <strong>{exam.name}</strong>
                  <small>
                    {topicLabel(exam.topicId)} · {exam.questionCount} questions
                  </small>
                </span>
                {isNew && <span className="series-review-new">Added</span>}
                {exam.status !== 'published' && <StatusPill status={exam.status} />}
                <span className="series-review-actions">
                  <button
                    type="button"
                    className="small-button secondary"
                    disabled={viewLoading}
                    onClick={() => onView(exam.id)}
                  >
                    View
                  </button>
                  {canRemove && (
                    <button
                      type="button"
                      className="small-button secondary"
                      onClick={() => onRemove(exam)}
                    >
                      Remove
                    </button>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="exam-picker-empty">No tests yet — add some in step 2.</p>
      )}
      {hasUnpublishedChanges && (
        <p className="notice unpublished-notice">
          There are unpublished changes saved. Please publish to make them live.
        </p>
      )}
    </>
  )
}
