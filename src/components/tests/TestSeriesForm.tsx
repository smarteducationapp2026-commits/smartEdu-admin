import { useState, type FormEvent } from 'react'
import type { Course, PublicExam } from '../../core/types'
import { BackHeading } from '../shared/BackHeading'
import { ConfirmDialog } from '../shared/ConfirmDialog'
import { ExamCreator } from '../shared/ExamCreator'
import { SearchInput } from '../shared/SearchInput'
import type { FormState } from './formState'
import { SeriesCover } from './SeriesCover'

type Timestamp = { seconds?: number }

export function TestSeriesForm({
  form,
  setForm,
  courses,
  exams,
  topicNames,
  examSearch,
  setExamSearch,
  editingId,
  saving,
  message,
  updatedAt,
  publishedAt,
  onBack,
  onSubmit,
  onPublish,
  onDelete,
  onToggleExam,
  onExamCreated,
}: {
  form: FormState
  setForm: (form: FormState) => void
  courses: Course[]
  exams: PublicExam[]
  topicNames: Record<string, string>
  examSearch: string
  setExamSearch: (value: string) => void
  editingId: string | null
  saving: boolean
  message: string
  updatedAt?: Timestamp
  publishedAt?: Timestamp
  onBack: () => void
  onSubmit: (event: FormEvent) => void
  onPublish: () => void
  onDelete: () => void
  onToggleExam: (examId: string) => void
  onExamCreated: (examId: string) => void
}) {
  const [creatingTest, setCreatingTest] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const hasUnpublishedChanges =
    editingId != null && ((updatedAt?.seconds ?? 0) > (publishedAt?.seconds ?? 0))
  const selectedExams = form.examIds
    .map((id) => exams.find((exam) => exam.id === id))
    .filter((exam): exam is PublicExam => Boolean(exam))
  const searchMatches = examSearch.trim()
    ? exams.filter(
        (exam) =>
          !form.examIds.includes(exam.id) &&
          `${exam.name} ${topicNames[exam.topicId] || ''}`
            .toLowerCase()
            .includes(examSearch.toLowerCase()),
      )
    : []
  const coverName = form.title.trim() ? `cover-${form.title.trim().toLowerCase()}` : 'cover-default'

  return (
    <div className="stack">
      <div className="series-form-header">
        <BackHeading
          title={form.title.trim() || (editingId ? 'Edit test series' : 'New test series')}
          onBack={onBack}
          label="Back to test series"
        />
        <div className="series-head-actions">
          <button type="submit" form="test-series-form" className="medium-button" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="medium-button secondary"
            disabled={!editingId || !hasUnpublishedChanges}
            title={!editingId ? 'Save the series first' : undefined}
            onClick={onPublish}
          >
            {form.status === 'published' && !hasUnpublishedChanges ? 'Published' : 'Publish'}
          </button>
          <button
            type="button"
            className="medium-button danger-button"
            disabled={!editingId}
            title={!editingId ? 'Save the series first' : undefined}
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </button>
        </div>
      </div>
      {hasUnpublishedChanges && (
        <p className="notice unpublished-notice">
          There are unpublished changes saved. Please publish to make them live.
        </p>
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this test series?"
          danger
          confirmLabel="Delete"
          message={
            form.status === 'published'
              ? 'This test series is published and visible to students right now. Deleting it removes it immediately, and this can’t be undone.'
              : 'This test series is only saved as a draft and hasn’t been published. Delete it anyway? This can’t be undone.'
          }
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false)
            onDelete()
          }}
        />
      )}
      <form id="test-series-form" className="card form" onSubmit={onSubmit}>
        <div className="grid12">
          <div className="cover-wrap col-4">
            <SeriesCover key={coverName} title={form.title} className="test-series-cover-preview" />
            <span
              className={`status-dot status-dot-${form.status}`}
              title={form.status === 'published' ? 'Published' : 'Draft'}
            />
          </div>
          <label className="col-4">
            <span className="field-label">
              Title <span className="required-mark">*</span>
            </span>
            <input
              className="shadow-input"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label className="col-4">
            <span className="field-label">
              Course <span className="required-mark">*</span>
            </span>
            <select
              required
              value={form.courseId}
              onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            >
              <option value="">Select a course</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <small className="field-hint">Which course this series appears under in the app.</small>
          </label>
        </div>
        <div className="grid12">
          <label className="col-8">
            <span className="field-label">Description</span>
            <textarea
              className="shadow-input"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>
          <div className="col-4 pricing-field">
            <div className="pricing-field-row">
              <span className="field-label">Pricing</span>
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
            </div>
            {form.pricingType === 'paid' && (
              <label>
                <span className="field-label">
                  Price (₹) <span className="required-mark">*</span>
                </span>
                <input
                  className="shadow-input"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                />
              </label>
            )}
          </div>
        </div>
        <div className="exam-picker-toolbar">
          <h3>Tests in this series ({form.examIds.length} selected)</h3>
          <button type="button" className="small-button secondary" onClick={() => setCreatingTest((v) => !v)}>
            {creatingTest ? 'Cancel' : '+ Create test'}
          </button>
        </div>
        {creatingTest ? (
          <ExamCreator
            topicId=""
            onCreated={(examId) => {
              onExamCreated(examId)
              setCreatingTest(false)
            }}
            onCancel={() => setCreatingTest(false)}
          />
        ) : (
          <>
            <div className="exam-picker">
              <SearchInput
                value={examSearch}
                onChange={setExamSearch}
                placeholder="Search published tests by name or topic to add…"
              />
              {examSearch.trim() && (
                <div className="exam-picker-dropdown">
                  {searchMatches.length === 0 && (
                    <p className="exam-picker-empty">No matching published tests found.</p>
                  )}
                  {searchMatches.map((exam) => (
                    <button
                      type="button"
                      key={exam.id}
                      className="secondary exam-picker-option"
                      onClick={() => {
                        onToggleExam(exam.id)
                        setExamSearch('')
                      }}
                    >
                      {exam.name}{' '}
                      <small>
                        ({topicNames[exam.topicId] || 'Unknown topic'} · {exam.questionCount}{' '}
                        questions)
                      </small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="card table-wrap">
              {selectedExams.length === 0 && (
                <p>No tests selected yet. Search above to add tests, or create a new one.</p>
              )}
              {selectedExams.map((exam) => (
                <div key={exam.id} className="exam-picker-selected-row">
                  <span>
                    {exam.name}{' '}
                    <small>
                      ({topicNames[exam.topicId] || 'Unknown topic'} · {exam.questionCount} questions)
                    </small>
                  </span>
                  <button
                    type="button"
                    className="small-button secondary"
                    onClick={() => onToggleExam(exam.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  )
}
