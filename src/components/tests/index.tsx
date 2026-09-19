import { useEffect, useState, type FormEvent } from 'react'
import './tests.css'
import type { Course, PublicExam, TestSeries } from '../../core/types'
import { loadTestSeriesData, publishTestSeries, saveTestSeries } from '../../services/tests'
import { emptyForm, type FormState } from './formState'
import { TestSeriesForm } from './TestSeriesForm'
import { TestSeriesList } from './TestSeriesList'

type Timestamp = { seconds?: number }

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
  const [seriesUpdatedAt, setSeriesUpdatedAt] = useState<Timestamp | undefined>()
  const [seriesPublishedAt, setSeriesPublishedAt] = useState<Timestamp | undefined>()

  const load = () =>
    loadTestSeriesData()
      .then((data) => {
        setSeries(data.series)
        setCourses(data.courses)
        setExams(data.exams)
        setTopicNames(data.topicNames)
        return data
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : 'Unable to load test series.')
        return null
      })
  useEffect(() => {
    void load()
  }, [])

  function openCreate() {
    if (!canEdit) return
    setEditingId(null)
    setForm(emptyForm)
    setExamSearch('')
    setMessage('')
    setSeriesUpdatedAt(undefined)
    setSeriesPublishedAt(undefined)
    setView('form')
  }

  function openSeries(item: TestSeries) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      description: item.description || '',
      courseId: item.courseId,
      examIds: item.examIds || [],
      status: item.status,
      pricingType: item.pricingType || 'free',
      price: item.price != null ? String(item.price) : '',
    })
    setExamSearch('')
    setMessage('')
    setSeriesUpdatedAt(item.updatedAt)
    setSeriesPublishedAt(item.publishedAt)
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

  async function publishSeries() {
    if (!canEdit || !editingId) return
    try {
      await publishTestSeries(editingId)
      setForm((current) => ({ ...current, status: 'published' }))
      const data = await load()
      const updated = data?.series.find((entry) => entry.id === editingId)
      setSeriesUpdatedAt(updated?.updatedAt)
      setSeriesPublishedAt(updated?.publishedAt)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish.') }
  }

  async function handleExamCreated(examId: string) {
    await load()
    setForm((current) =>
      current.examIds.includes(examId) ? current : { ...current, examIds: [...current.examIds, examId] },
    )
  }

  async function saveSeries(event: FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    if (!form.title.trim() || !form.courseId || form.examIds.length === 0) {
      setMessage('Title, course, and at least one test are required.')
      return
    }
    if (form.pricingType === 'paid' && (!form.price || Number(form.price) <= 0)) {
      setMessage('Enter a valid price, or switch this series to Free.')
      return
    }
    setSaving(true)
    setMessage('Saving…')
    try {
      const id = await saveTestSeries(editingId, { ...form, price: Number(form.price) || 0 })
      setEditingId(id)
      setMessage('Test series saved.')
      const data = await load()
      const updated = data?.series.find((entry) => entry.id === id)
      setSeriesUpdatedAt(updated?.updatedAt)
      setSeriesPublishedAt(updated?.publishedAt)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save test series.') }
    finally { setSaving(false) }
  }

  if (view === 'form') {
    return (
      <TestSeriesForm
        form={form}
        setForm={setForm}
        courses={courses}
        exams={exams}
        topicNames={topicNames}
        examSearch={examSearch}
        setExamSearch={setExamSearch}
        editingId={editingId}
        saving={saving}
        message={message}
        updatedAt={seriesUpdatedAt}
        publishedAt={seriesPublishedAt}
        onBack={() => setView('list')}
        onSubmit={saveSeries}
        onPublish={() => void publishSeries()}
        onToggleExam={toggleExam}
        onExamCreated={(examId) => void handleExamCreated(examId)}
      />
    )
  }

  return (
    <TestSeriesList
      canEdit={canEdit}
      series={series}
      courses={courses}
      message={message}
      onCreate={openCreate}
      onOpen={openSeries}
    />
  )
}
