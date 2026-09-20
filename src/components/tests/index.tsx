import { useEffect, useState, type FormEvent } from 'react'
import './tests.css'
import type { PublicExam, TestSeries } from '../../core/types'
import { deleteTestSeries, loadTestSeriesData, publishExams, publishTestSeries, saveTestSeries } from '../../services/tests'
import { deleteExam } from '../../services/subjects'
import { emptyForm, type FormState } from './formState'
import { TestSeriesForm } from './TestSeriesForm'
import { TestSeriesList } from './TestSeriesList'

type Timestamp = { seconds?: number }

export function Tests({ role }: { role: 'admin' | 'superAdmin' }) {
  const canEdit = role === 'superAdmin'
  const [series, setSeries] = useState<TestSeries[]>([])
  const [exams, setExams] = useState<PublicExam[]>([])
  const [topicNames, setTopicNames] = useState<Record<string, string>>({})
  const [view, setView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [examSearch, setExamSearch] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  // Tests attached/created during this editing session — highlighted green
  // in step 3's review, until the form is closed or another series opened.
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [seriesUpdatedAt, setSeriesUpdatedAt] = useState<Timestamp | undefined>()
  const [seriesPublishedAt, setSeriesPublishedAt] = useState<Timestamp | undefined>()

  const load = () =>
    loadTestSeriesData()
      .then((data) => {
        setSeries(data.series)
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
    setAddedIds(new Set())
    setExamSearch('')
    setMessage('')
    setSeriesUpdatedAt(undefined)
    setSeriesPublishedAt(undefined)
    setView('form')
  }

  function openSeries(item: TestSeries) {
    setEditingId(item.id)
    setAddedIds(new Set())
    setForm({
      title: item.title,
      description: item.description || '',
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
    // Attaching only stages the link — Step 2's Update button saves it.
    // Detaching goes through the remove dialog instead.
    if (!canEdit || form.examIds.includes(examId)) return
    setAddedIds((current) => new Set(current).add(examId))
    setForm((current) => ({
      ...current,
      examIds: current.examIds.includes(examId) ? current.examIds : [...current.examIds, examId],
    }))
    setMessage('Test attached — press Update in step 2 to save.')
  }

  // Writes the staged test links with the STORED details — Update never
  // touches unsaved title/description/pricing edits (that's Save's job).
  async function persistExamIds(nextExamIds: string[], successMessage: string) {
    if (!canEdit || !editingId) return false
    const saved = series.find((entry) => entry.id === editingId)
    if (!saved) return false
    setSaving(true)
    setMessage('Saving…')
    try {
      await saveTestSeries(editingId, {
        title: saved.title,
        description: saved.description || '',
        examIds: nextExamIds,
        status: saved.status,
        pricingType: saved.pricingType || 'free',
        price: saved.price || 0,
      })
      setMessage(successMessage)
      const data = await load()
      const updated = data?.series.find((entry) => entry.id === editingId)
      setSeriesUpdatedAt(updated?.updatedAt)
      setSeriesPublishedAt(updated?.publishedAt)
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save test series.')
      return false
    } finally {
      setSaving(false)
    }
  }

  async function publishSeries() {
    if (!canEdit || !editingId) return false
    if (testsDirty) {
      setMessage('Update step 2 first — there are unsaved test changes.')
      return false
    }
    if (detailsDirty) {
      setMessage('Save step 1 first — there are unsaved detail changes.')
      return false
    }
    const saved = series.find((entry) => entry.id === editingId)
    const selected = (saved?.examIds || [])
      .map((id) => exams.find((exam) => exam.id === id))
      .filter((exam): exam is PublicExam => Boolean(exam))
    if (selected.length === 0) {
      setMessage('Add at least one test before publishing.')
      return false
    }
    try {
      // Draft members go live together with the series.
      const draftIds = selected.filter((exam) => exam.status !== 'published').map((exam) => exam.id)
      await publishExams(draftIds)
      await publishTestSeries(editingId)
      setForm((current) => ({ ...current, status: 'published' }))
      setMessage(
        draftIds.length > 0
          ? `Series published — ${draftIds.length} draft test${draftIds.length === 1 ? '' : 's'} published with it.`
          : 'Test series published.',
      )
      const data = await load()
      const updated = data?.series.find((entry) => entry.id === editingId)
      setSeriesUpdatedAt(updated?.updatedAt)
      setSeriesPublishedAt(updated?.publishedAt)
      // Published details are now live — clear session "new" highlights so
      // the page reloads as a clean published view.
      setAddedIds(new Set())
      return true
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to publish.')
      return false
    }
  }

  async function deleteSeries(deleteTests: boolean) {
    if (!canEdit || !editingId) return
    setSaving(true)
    setMessage('Deleting…')
    try {
      if (deleteTests) {
        // Permanently remove attached tests that live nowhere else.
        // Tests shared with other series are left untouched.
        for (const examId of form.examIds) {
          const usedElsewhere = series.some(
            (entry) => entry.id !== editingId && (entry.examIds || []).includes(examId),
          )
          if (!usedElsewhere) await deleteExam(examId)
        }
      }
      await deleteTestSeries(editingId)
      setView('list')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete test series.') }
    finally { setSaving(false) }
  }

  // A test created from a series is attached AND saved immediately: the
  // exam doc already exists in Firestore, so leaving without saving would
  // silently drop the link (a series-only test would then be visible nowhere).
  async function handleExamCreated(examId: string) {
    if (!canEdit || !editingId) return
    setAddedIds((current) => new Set(current).add(examId))
    setForm((current) =>
      current.examIds.includes(examId) ? current : { ...current, examIds: [...current.examIds, examId] },
    )
    setMessage('Test created — press Update in step 2 to save.')
    await load()
  }

  async function detachExam(examId: string) {
    if (!canEdit || !editingId) return
    setAddedIds((current) => {
      const next = new Set(current)
      next.delete(examId)
      return next
    })
    setForm((current) => ({
      ...current,
      examIds: current.examIds.filter((id) => id !== examId),
    }))
    setMessage('Test detached — press Update in step 2 to save.')
  }

  // Staged test links (attach/detach/create) are saved with Step 2's Update
  // button — or from the leave-page prompt. True when the form's tests differ
  // from what's stored for this series.
  const savedExamIds = series.find((entry) => entry.id === editingId)?.examIds || []
  const testsDirty =
    editingId != null &&
    (form.examIds.length !== savedExamIds.length ||
      form.examIds.some((id, index) => id !== savedExamIds[index]))

  // Step 1 edits staged in the form vs what's stored. Save persists these
  // without touching the stored test links (that's Update's job).
  const savedEntry = series.find((entry) => entry.id === editingId)
  const detailsDirty =
    editingId != null &&
    savedEntry != null &&
    (form.title.trim() !== (savedEntry.title || '').trim() ||
      (form.description || '').trim() !== (savedEntry.description || '').trim() ||
      form.pricingType !== (savedEntry.pricingType || 'free') ||
      (form.pricingType === 'paid' &&
        (Number(form.price) || 0) !== (savedEntry.price || 0)))

  async function saveTests() {
    if (!editingId) return false
    return persistExamIds(form.examIds, 'Tests updated.')
  }

  // Deletes the exam everywhere: detached from every series using it, then
  // both Firestore docs removed.
  async function deleteExamEverywhere(examId: string) {
    if (!canEdit) return
    setSaving(true)
    setMessage('Deleting test…')
    try {
      for (const entry of series) {
        if ((entry.examIds || []).includes(examId)) {
          await saveTestSeries(entry.id, {
            title: entry.title,
            description: entry.description || '',
            examIds: (entry.examIds || []).filter((id) => id !== examId),
            status: entry.status,
            pricingType: entry.pricingType || 'free',
            price: entry.price || 0,
          })
        }
      }
      await deleteExam(examId)
      setAddedIds((current) => {
        const next = new Set(current)
        next.delete(examId)
        return next
      })
      setForm((current) => ({
        ...current,
        examIds: current.examIds.filter((id) => id !== examId),
      }))
      setMessage('Test deleted everywhere.')
      await load()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to delete test.')
    } finally {
      setSaving(false)
    }
  }

  const countSeriesUsing = (examId: string) =>
    series.filter((entry) => entry.id !== editingId && (entry.examIds || []).includes(examId)).length

  async function saveSeries(event: FormEvent) {
    event.preventDefault()
    if (!canEdit) return
    if (!form.title.trim()) {
      setMessage('Title is required.')
      return
    }
    // A draft may be saved with no tests yet — tests are added after the
    // first save. Publishing still requires at least one test (see above).
    if (form.pricingType === 'paid' && (!form.price || Number(form.price) <= 0)) {
      setMessage('Enter a valid price, or switch this series to Free.')
      return
    }
    setSaving(true)
    setMessage('Saving…')
    try {
      // Save persists only the details — stored test links are preserved,
      // never overwritten with staged step-2 edits.
      const storedExamIds =
        editingId != null
          ? series.find((entry) => entry.id === editingId)?.examIds || []
          : []
      const id = await saveTestSeries(editingId, {
        ...form,
        price: Number(form.price) || 0,
        examIds: storedExamIds,
      })
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
        exams={exams}
        topicNames={topicNames}
        examSearch={examSearch}
        setExamSearch={setExamSearch}
        editingId={editingId}
        saving={saving}
        message={message}
        canEdit={canEdit}
        testsDirty={testsDirty}
        detailsDirty={detailsDirty}
        savedTestCount={savedExamIds.length}
        savedExamIds={savedExamIds}
        updatedAt={seriesUpdatedAt}
        publishedAt={seriesPublishedAt}
        onBack={() => setView('list')}
        onSubmit={saveSeries}
        onPublish={() => publishSeries()}
        onDelete={(deleteTests) => void deleteSeries(deleteTests)}
        onToggleExam={toggleExam}
        onExamCreated={(examId) => void handleExamCreated(examId)}
        onDetachExam={(examId) => void detachExam(examId)}
        addedIds={addedIds}
        onSaveTests={() => saveTests()}
        onDeleteExam={(exam) => void deleteExamEverywhere(exam.id)}
        countSeriesUsing={countSeriesUsing}
        onExamChanged={() => void load()}
      />
    )
  }

  return (
    <TestSeriesList
      canEdit={canEdit}
      series={series}
      message={message}
      onCreate={openCreate}
      onOpen={openSeries}
    />
  )
}
