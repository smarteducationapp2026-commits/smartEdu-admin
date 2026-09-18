import { useEffect, useState, type FormEvent } from 'react'
import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { Course, ExamAnswerOption, ExamQuestion, PublicExam, Subject, TestSeries } from '../../../core/types'

type FormState = { title: string; description: string; courseId: string; examIds: string[]; status: 'draft' | 'published' }
const emptyForm: FormState = { title: '', description: '', courseId: '', examIds: [], status: 'draft' }

// Cover design used in place of a thumbnail image (uploads need Firebase
// Storage, which needs the Blaze plan) — a gradient + initial derived from
// the title, so every series still gets a distinct-looking card. Mirrored
// in the mobile app's Tests tab; keep the two palettes in sync if changed.
const COVER_GRADIENTS = [
  ['#55B9EE', '#1767B1'],
  ['#667EEA', '#764BA2'],
  ['#11998E', '#1F4037'],
  ['#FF8C42', '#C1440E'],
]
function coverGradient(title: string) {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return COVER_GRADIENTS[Math.abs(hash) % COVER_GRADIENTS.length]
}
function SeriesCover({ title, className }: { title: string; className: string }) {
  const [from, to] = coverGradient(title || '?')
  return <div className={className} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
    {(title || '?').charAt(0).toUpperCase()}
  </div>
}

const DEMO_SERIES_COUNT = 8
const DEMO_EXAMS_PER_SERIES = 10
const DEMO_QUESTIONS_PER_EXAM = 20
const OPTION_LETTERS: ExamAnswerOption[] = ['A', 'B', 'C', 'D']

function demoQuestions(examLabel: string): ExamQuestion[] {
  return Array.from({ length: DEMO_QUESTIONS_PER_EXAM }, (_, i) => ({
    question: `${examLabel} — Question ${i + 1}: choose the correct option.`,
    optionA: `${examLabel} Q${i + 1} · Option A`,
    optionB: `${examLabel} Q${i + 1} · Option B`,
    optionC: `${examLabel} Q${i + 1} · Option C`,
    optionD: `${examLabel} Q${i + 1} · Option D`,
    correctAnswer: OPTION_LETTERS[i % 4],
    explanation: `Placeholder explanation for question ${i + 1} of ${examLabel}.`,
  }))
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

  const load = () => Promise.all([
    getDocs(collection(db, 'testSeries')),
    getDocs(collection(db, 'courses')),
    getDocs(collection(db, 'examQuestions')),
    getDocs(collection(db, 'subjects')),
  ]).then(([seriesSnap, courseSnap, examSnap, subjectSnap]) => {
    setSeries(seriesSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as TestSeries))
    setCourses(courseSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as Course))
    setExams(examSnap.docs.map((item) => ({ id: item.id, ...item.data() }) as PublicExam).filter((exam) => exam.status === 'published'))
    setTopicNames(Object.fromEntries(subjectSnap.docs.map((item) => [item.id, (item.data() as Subject).name])))
  }).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load test series.'))
  useEffect(() => { void load() }, [])

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
    setForm({ title: item.title, description: item.description || '', courseId: item.courseId, examIds: item.examIds || [], status: item.status })
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
      await updateDoc(doc(db, 'testSeries', item.id), { status: nextStatus, updatedAt: serverTimestamp() })
      setSeries((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: nextStatus } : entry))
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update status.') }
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
      const seriesRef = editingId ? doc(db, 'testSeries', editingId) : doc(collection(db, 'testSeries'))
      await setDoc(seriesRef, {
        title: form.title.trim(),
        description: form.description.trim(),
        courseId: form.courseId,
        examIds: form.examIds,
        status: form.status,
        updatedAt: serverTimestamp(),
        ...(editingId ? {} : { createdAt: serverTimestamp() }),
      }, { merge: true })
      setMessage('Test series saved.')
      setView('list')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save test series.') }
    finally { setSaving(false) }
  }

  async function seedDemoTestSeries() {
    if (!canEdit || loadingDemo) return
    if (!window.confirm(
      `Create ${DEMO_SERIES_COUNT} demo test series with ${DEMO_EXAMS_PER_SERIES} exams each ` +
      `(${DEMO_QUESTIONS_PER_EXAM} questions per exam)? This adds sample content for testing the mobile app.`,
    )) return

    setLoadingDemo(true)
    setMessage('Loading demo test series…')
    try {
      // A course to attach the demo series to — reuse the first existing one, or create one.
      let courseId = courses[0]?.id
      if (!courseId) {
        const courseRef = doc(collection(db, 'courses'))
        await setDoc(courseRef, { title: 'Demo Course', active: true, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        courseId = courseRef.id
      }

      const existingTitles = new Set(series.map((item) => item.title))
      let batch = writeBatch(db)
      let opCount = 0
      let seriesCreated = 0
      const flush = async () => { if (opCount > 0) { await batch.commit(); batch = writeBatch(db); opCount = 0 } }

      for (let s = 1; s <= DEMO_SERIES_COUNT; s++) {
        const seriesTitle = `Demo Test Series ${s}`
        if (existingTitles.has(seriesTitle)) continue

        const examIds: string[] = []
        for (let e = 1; e <= DEMO_EXAMS_PER_SERIES; e++) {
          const examLabel = `${seriesTitle} — Exam ${e}`
          const questions = demoQuestions(examLabel)

          // No topicId — demo exams aren't part of the Subjects tree, only
          // reachable through their test series.
          if (opCount >= 400) await flush()
          const examRef = doc(collection(db, 'exams'))
          batch.set(examRef, { name: examLabel, description: '', topicId: '', questions, status: 'published', timerEnabled: false, timerType: null, timerSeconds: null, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
          opCount++

          if (opCount >= 400) await flush()
          batch.set(doc(db, 'examQuestions', examRef.id), {
            name: examLabel,
            topicId: '',
            questionCount: questions.length,
            status: 'published',
            questions: questions.map(({ question, optionA, optionB, optionC, optionD }) => ({ question, optionA, optionB, optionC, optionD })),
            timerEnabled: false,
            timerType: null,
            timerSeconds: null,
            updatedAt: serverTimestamp(),
          })
          opCount++
          examIds.push(examRef.id)
        }

        if (opCount >= 400) await flush()
        const seriesRef = doc(collection(db, 'testSeries'))
        batch.set(seriesRef, { title: seriesTitle, description: `Auto-generated demo series with ${DEMO_EXAMS_PER_SERIES} exams.`, courseId, examIds, status: 'published', createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
        opCount++
        seriesCreated++
      }
      await flush()
      setMessage(seriesCreated > 0 ? `Loaded ${seriesCreated} demo test series.` : 'Demo test series are already loaded.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to load demo test series.') }
    finally { setLoadingDemo(false) }
  }

  if (view === 'form') {
    const selectedExams = form.examIds
      .map((id) => exams.find((exam) => exam.id === id))
      .filter((exam): exam is PublicExam => Boolean(exam))
    const searchMatches = examSearch.trim()
      ? exams.filter((exam) =>
          !form.examIds.includes(exam.id) &&
          `${exam.name} ${topicNames[exam.topicId] || ''}`.toLowerCase().includes(examSearch.toLowerCase()))
      : []
    return <div className="stack">
      <button className="back-link" onClick={() => setView('list')} aria-label="Back to test series" title="Back to test series">←</button>
      <form className="card form" onSubmit={saveSeries}>
        <h3>{editingId ? 'Edit test series' : 'New test series'}</h3>
        {form.title.trim() && <SeriesCover title={form.title} className="test-series-cover-preview" />}
        <div className="form-grid">
          <label><span className="field-label">Title <span className="required-mark">*</span></span>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label><span className="field-label">Description</span>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <label><span className="field-label">Course <span className="required-mark">*</span></span>
            <select required value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
              <option value="">Select a course</option>
              {courses.map((course) => <option key={course.id} value={course.id}>{course.title}</option>)}
            </select>
          </label>
          <div>
            <span className="field-label">Status</span>
            <div className="row">
              <label><input type="radio" name="seriesStatus" checked={form.status === 'draft'} onChange={() => setForm({ ...form, status: 'draft' })} /> Draft</label>
              <label><input type="radio" name="seriesStatus" checked={form.status === 'published'} onChange={() => setForm({ ...form, status: 'published' })} /> Published</label>
            </div>
          </div>
        </div>
        <div className="form-header"><h3>Tests in this series ({form.examIds.length} selected)</h3></div>
        <div className="exam-picker">
          <input
            placeholder="Search published tests by name or topic to add…"
            value={examSearch}
            onChange={(e) => setExamSearch(e.target.value)}
          />
          {examSearch.trim() && <div className="exam-picker-dropdown">
            {searchMatches.length === 0 && <p className="exam-picker-empty">No matching published tests found.</p>}
            {searchMatches.map((exam) => <button
              type="button"
              key={exam.id}
              className="secondary exam-picker-option"
              onClick={() => { toggleExam(exam.id); setExamSearch('') }}
            >
              {exam.name} <small>({topicNames[exam.topicId] || 'Unknown topic'} · {exam.questionCount} questions)</small>
            </button>)}
          </div>}
        </div>
        <div className="card table-wrap">
          {selectedExams.length === 0 && <p>No tests selected yet. Search above to add tests.</p>}
          {selectedExams.map((exam) => <div key={exam.id} className="exam-picker-selected-row">
            <span>{exam.name} <small>({topicNames[exam.topicId] || 'Unknown topic'} · {exam.questionCount} questions)</small></span>
            <button type="button" className="small-button secondary" onClick={() => toggleExam(exam.id)}>Remove</button>
          </div>)}
        </div>
        <button className="medium-button" disabled={saving}>{saving ? 'Saving…' : 'Save test series'}</button>
        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  }

  return <div className="stack">
    <div className="toolbar">
      {canEdit && <button onClick={openCreate}>+ New test series</button>}
      {canEdit && <button className="secondary" disabled={loadingDemo} onClick={() => void seedDemoTestSeries()}>
        {loadingDemo ? 'Loading…' : `Load ${DEMO_SERIES_COUNT} demo test series`}
      </button>}
    </div>
    {!canEdit && <p className="notice">Admin access is read-only. Only Super Admins can create or edit test series.</p>}
    {message && <p className="notice">{message}</p>}
    {series.length === 0 && <div className="card"><p>No test series yet. Create one from your published exams.</p></div>}
    <div className="test-series-grid">
      {series.map((item) => <div className="card test-series-card" key={item.id}>
        <SeriesCover title={item.title} className="test-series-cover-card" />
        <div className="test-series-card-body">
          <div className="test-series-card-head">
            <h3>{item.title}</h3>
            <span className={`status-pill status-${item.status}`}>{item.status}</span>
          </div>
          <p className="test-series-card-meta">{courseTitle(item.courseId)} · {item.examIds?.length ?? 0} test{item.examIds?.length === 1 ? '' : 's'}</p>
          {canEdit && <div className="row">
            <button className="small-button" onClick={() => openEdit(item)}>Edit</button>
            <button className="small-button" onClick={() => void togglePublish(item)}>{item.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          </div>}
        </div>
      </div>)}
    </div>
  </div>
}
