import { useEffect, useState, type FormEvent } from 'react'
import type { Course, PublicExam, TestSeries } from '../../core/types'
import {
  DEMO_EXAMS_PER_SERIES,
  DEMO_QUESTIONS_PER_EXAM,
  DEMO_SERIES_COUNT,
  loadTestSeriesData,
  saveTestSeries,
  seedDemoTestSeries,
  updateSeriesStatus,
} from '../../services/tests'
import { BackHeading } from '../shared/BackHeading'
import { SearchInput } from '../shared/SearchInput'
import { StatusPill } from '../shared/StatusPill'
import { SeriesCover } from './SeriesCover'

type FormState = {
  title: string
  description: string
  courseId: string
  examIds: string[]
  status: 'draft' | 'published'
}
const emptyForm: FormState = {
  title: '',
  description: '',
  courseId: '',
  examIds: [],
  status: 'draft',
}

export function Tests({ role }: { role: 'admin' | 'superAdmin' }) {
  const canEdit = role === 'superAdmin'
  const [series, setSeries] = useState<TestSeries[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [exams, setExams] = useState<PublicExam[]>([])
  const [topicNames, setTopicNames] = useState<Record<string, string>>({})
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [examSearch, setExamSearch] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [loadingDemo, setLoadingDemo] = useState(false)

  const load = () =>
    loadTestSeriesData()
      .then((data) => {
        setSeries(data.series)
        setCourses(data.courses)
        setExams(data.exams)
        setTopicNames(data.topicNames)
      })
      .catch((error) =>
        setMessage(error instanceof Error ? error.message : 'Unable to load test series.'),
      )
  useEffect(() => {
    void load()
  }, [])

  function courseTitle(courseId: string) {
    return courses.find((course) => course.id === courseId)?.title || '—'
  }

  function openCreate() {
    if (!canEdit) return
    setEditingId(null)
    setForm(emptyForm)
    setExamSearch('')
    setMessage('')
    setView('form')
  }

  function openEdit(item: TestSeries) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description || '',
      courseId: item.courseId,
      examIds: item.examIds || [],
      status: item.status,
    })
    setExamSearch('')
    setMessage('')
    setView('form')
  }

  function toggleExam(examId: string) {
    setForm((current) => ({
      ...current,
      examIds: current.examIds.includes(examId)
        ? current.examIds.filter((id) => id !== examId)
        : [...current.examIds, examId],
    }))
  }

  async function togglePublish(item: TestSeries) {
    if (!canEdit) return
    try {
      const nextStatus = item.status === 'published' ? 'draft' : 'published'
      await updateSeriesStatus(item.id, nextStatus)
      setSeries((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, status: nextStatus } : entry)),
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update status.')
    }
  }

  async function toggleFormPublish() {
    if (!canEdit || !editingId) return
    try {
      const nextStatus = form.status === 'published' ? 'draft' : 'published'
      await updateSeriesStatus(editingId, nextStatus)
      setForm((current) => ({ ...current, status: nextStatus }))
      setSeries((current) =>
        current.map((entry) => (entry.id === editingId ? { ...entry, status: nextStatus } : entry)),
      )
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update status.')
    }
  }

  async function saveSeries(event: FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    if (!form.title.trim() || !form.courseId || form.examIds.length === 0) {
      setMessage('Title, course, and at least one test are required.')
      return
    }
    setSaving(true)
    setMessage('Saving…')
    try {
      await saveTestSeries(editingId, form)
      setMessage('Test series saved.')
      setView('list')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save test series.')
    } finally {
      setSaving(false)
    }
  }

  async function loadDemoTestSeries() {
    if (!canEdit || loadingDemo) return
    if (
      !window.confirm(
        `Create ${DEMO_SERIES_COUNT} demo test series with ${DEMO_EXAMS_PER_SERIES} exams each ` +
          `(${DEMO_QUESTIONS_PER_EXAM} questions per exam)? This adds sample content for testing the mobile app.`,
      )
    )
      return

    setLoadingDemo(true)
    setMessage('Loading demo test series…')
    try {
      const seriesCreated = await seedDemoTestSeries(series, courses)
      setMessage(
        seriesCreated > 0
          ? `Loaded ${seriesCreated} demo test series.`
          : 'Demo test series are already loaded.',
      )
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load demo test series.')
    } finally {
      setLoadingDemo(false)
    }
  }

  if (view === 'form') {
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
    return (
      <div className="stack">
        <BackHeading
          title={form.title.trim() || (editingId ? 'Edit test series' : 'New test series')}
          onBack={() => setView('list')}
          label="Back to test series"
        />
        <form className="card form" onSubmit={saveSeries}>
          <div className="series-head-row">
            {form.title.trim() && (
              <div className="cover-wrap">
                <SeriesCover title={form.title} className="test-series-cover-preview" />
                <span
                  className={`status-dot status-dot-${form.status}`}
                  title={form.status === 'published' ? 'Published' : 'Draft'}
                />
              </div>
            )}
            <div className="series-head-actions">
              <button type="submit" className="medium-button" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                className="medium-button secondary"
                disabled={!editingId}
                title={!editingId ? 'Save the series first' : undefined}
                onClick={() => void toggleFormPublish()}
              >
                {form.status === 'published' ? 'Unpublish' : 'Publish'}
              </button>
            </div>
          </div>
          <div className="grid12">
            <label className="col-3">
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
            <label className="col-3">
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
              <small className="field-hint">
                Which course this series appears under in the app.
              </small>
            </label>
            <label className="col-6">
              <span className="field-label">Description</span>
              <textarea
                className="shadow-input"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>
          <div className="form-header">
            <h3>Tests in this series ({form.examIds.length} selected)</h3>
          </div>
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
                      toggleExam(exam.id)
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
            {selectedExams.length === 0 && <p>No tests selected yet. Search above to add tests.</p>}
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
                  onClick={() => toggleExam(exam.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
          {message && <p className="notice">{message}</p>}
        </form>
      </div>
    )
  }

  return (
    <div className="stack">
      <div className="toolbar">
        {canEdit && <button onClick={openCreate}>+ New test series</button>}
        {canEdit && (
          <button
            className="secondary"
            disabled={loadingDemo}
            onClick={() => void loadDemoTestSeries()}
          >
            {loadingDemo ? 'Loading…' : `Load ${DEMO_SERIES_COUNT} demo test series`}
          </button>
        )}
      </div>
      {!canEdit && (
        <p className="notice">
          Admin access is read-only. Only Super Admins can create or edit test series.
        </p>
      )}
      {message && <p className="notice">{message}</p>}
      {series.length === 0 && (
        <div className="card">
          <p>No test series yet. Create one from your published exams.</p>
        </div>
      )}
      <div className="test-series-grid">
        {series.map((item) => (
          <div className="card test-series-card" key={item.id}>
            <SeriesCover title={item.title} className="test-series-cover-card" />
            <div className="test-series-card-body">
              <div className="test-series-card-head">
                <h3>{item.title}</h3>
                <StatusPill status={item.status} />
              </div>
              <p className="test-series-card-meta">
                {courseTitle(item.courseId)} · {item.examIds?.length ?? 0} test
                {item.examIds?.length === 1 ? '' : 's'}
              </p>
              {canEdit && (
                <div className="row">
                  <button className="small-button" onClick={() => openEdit(item)}>
                    Edit
                  </button>
                  <button className="small-button" onClick={() => void togglePublish(item)}>
                    {item.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
