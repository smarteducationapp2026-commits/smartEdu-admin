import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { sendPasswordResetEmail, signOut, type User } from 'firebase/auth'
import { collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc, writeBatch } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { auth, db, firebaseConfig, storage } from '../../firebase'
import type { AdminUser, Chapter, Course, Exam, Subject, Test, UserRecord } from '../../types'

const makeReferralCode = () => `SMART-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
const strongPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint32Array(24)), (value) => alphabet[value % alphabet.length]).join('')
}

export function Dashboard({ user, role }: { user: Pick<User, 'email'>; role: 'admin' | 'superAdmin' }) {
  const [section, setSection] = useState<'overview' | 'subjects' | 'organizer' | 'users' | 'courses' | 'tests' | 'profile'>('overview')
  const [profileOpen, setProfileOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const title = ({ overview: 'Overview', subjects: 'Subjects', organizer: 'File Organizer', users: 'Manage Users', courses: 'Manage courses', tests: 'Test Series', profile: 'Profile' } as const)[section]
  const accountUser = user as AdminUser
  return <div className={`layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
    <aside><p className="eyebrow sidebar-label">SMARTEDU</p><h2 className="sidebar-label">Admin Console</h2><nav>
      {([['overview', '⌂', 'Overview'], ...(role === 'superAdmin' ? [['users', '♙', 'Manage Users'] as const] : []), ['subjects', '▦', 'Subjects'] as const, ['tests', '✓', 'Test Series']] as const).map(([key, icon, label]) =>
        <button key={key} title={label} className={section === key ? 'selected' : ''} onClick={() => setSection(key)}><span className="menu-icon">{icon}</span><span className="sidebar-label">{label}</span></button>)}
    </nav><button className="signout" title="Sign out" onClick={() => signOut(auth)}><span className="menu-icon">↪</span><span className="sidebar-label">Sign out</span></button></aside>
    <main className="content"><div className="topbar"><div className="brand"><button className="sidebar-toggle" onClick={() => setSidebarCollapsed((v) => !v)} aria-label={sidebarCollapsed ? 'Expand side menu' : 'Collapse side menu'}>{sidebarCollapsed ? '☰' : '‹'}</button><span className="brand-mark">S</span><strong>SmartEdu</strong><span className="brand-banner">Admin learning center</span></div>
      <div className="profile-menu"><button className="profile-trigger" onClick={() => setProfileOpen((v) => !v)} aria-expanded={profileOpen}><Avatar user={accountUser} /><span className="profile-name">{accountUser.displayName || accountUser.email || 'Admin'}</span><span className="chevron">⌄</span></button>
        {profileOpen && <div className="dropdown"><button onClick={() => { setSection('profile'); setProfileOpen(false) }}>Profile</button><button onClick={() => signOut(auth)}>Logout</button></div>}</div></div>
      {section !== 'profile' && <header><div><p className="eyebrow">CONTROL CENTER</p><h1>{title}</h1></div><span>{user.email}</span></header>}
      {section === 'overview' && <Overview />}{section === 'subjects' && <Subjects role={role} />}{section === 'organizer' && role === 'superAdmin' && <FileOrganizer />}{section === 'users' && role === 'superAdmin' && <Users />}{section === 'courses' && <Courses />}{section === 'tests' && <Tests />}
      {section === 'profile' && <Profile user={{ ...accountUser, uid: 'uid' in user && typeof user.uid === 'string' ? user.uid : '' }} />}
    </main></div>
}

function Avatar({ user }: { user: Pick<User, 'photoURL' | 'displayName' | 'email'> }) {
  const nameParts = user.displayName?.trim().split(/\s+/).filter(Boolean) || []
  const initials = nameParts.length > 1
    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
    : (nameParts[0] || user.email || 'A').slice(0, 2)
  return user.photoURL ? <img className="avatar" src={user.photoURL} alt="" /> : <span className="avatar avatar-fallback">{initials.toUpperCase()}</span>
}

function Overview() {
  const [counts, setCounts] = useState({ users: 0, courses: 0, tests: 0 })
  useEffect(() => { Promise.all([getDocs(collection(db, 'users')), getDocs(collection(db, 'courses')), getDocs(collection(db, 'tests'))]).then(([users, courses, tests]) => setCounts({ users: users.docs.filter((item) => item.data().role !== 'superAdmin').length, courses: courses.size, tests: tests.size })) }, [])
  return <div className="grid"><div className="stat"><span>Total users</span><strong>{counts.users}</strong></div><div className="stat"><span>Courses</span><strong>{counts.courses}</strong></div><div className="stat"><span>Tests</span><strong>{counts.tests}</strong></div><div className="card"><h3>Admin security</h3><p>Admin access is controlled by the Firestore profile role. Keep administrator roles limited to trusted accounts.</p></div></div>
}

function Subjects({ role }: { role: 'admin' | 'superAdmin' }) {
  const [items, setItems] = useState<Subject[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')
  const [includeMixed, setIncludeMixed] = useState(false)
  const [topicParentId, setTopicParentId] = useState('')
  const [examName, setExamName] = useState('')
  const [examDescription, setExamDescription] = useState('')
  const [examFile, setExamFile] = useState<File | null>(null)
  const [examQuestions, setExamQuestions] = useState<Record<string, string>[]>([])
  const [examStatus, setExamStatus] = useState<'draft' | 'created' | 'published'>('draft')
  const [examId, setExamId] = useState('')
  const [actionOpen, setActionOpen] = useState(false)
  const [selectedItemId, setSelectedItemId] = useState('')
  const [viewItemId, setViewItemId] = useState('')
  const [createView, setCreateView] = useState<'subject' | 'topic' | 'exam' | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState('')
  const canEdit = role === 'superAdmin'
  const load = async () => {
    const subjectSnapshot = await getDocs(collection(db, 'subjects'))
    setItems(subjectSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Subject)))
  }
  useEffect(() => { void load().catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load subjects.')) }, [])
  const childrenOf = (id: string | null) => items
    .filter((item) => (item.parentId || null) === id && (id !== null || item.type !== 'mixed'))
    .sort((a, b) => (a.order || 0) - (b.order || 0))
  async function createItem(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !name.trim()) return
    const type = 'subject'
    const parentChildren = childrenOf(null)
    const itemRef = doc(collection(db, 'subjects'))
    const batch = writeBatch(db)
    batch.set(itemRef, { name: name.trim(), description: description.trim(), parentId: null, type, status, order: parentChildren.length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    if (includeMixed) {
      const mixedRef = doc(collection(db, 'subjects'))
      batch.set(mixedRef, { name: 'Mixed', parentId: itemRef.id, type: 'mixed', status: 'active', order: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }
    try { await batch.commit(); resetCreateForm(); setMessage('Subject created.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create subject item.') }
  }
  function resetCreateForm() {
    setName('')
    setDescription('')
    setStatus('active')
    setIncludeMixed(false)
    setTopicParentId('')
    setExamName('')
    setExamDescription('')
    setExamFile(null)
    setExamQuestions([])
    setExamStatus('draft')
    setExamId('')
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
  async function createTopic(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !topicParentId || !name.trim()) return
    const parent = items.find((item) => item.id === topicParentId)
    const itemRef = doc(collection(db, 'subjects'))
    const batch = writeBatch(db)
    batch.set(itemRef, { name: name.trim(), description: description.trim(), parentId: topicParentId, type: parent?.type === 'topic' ? 'subtopic' : 'topic', status, order: childrenOf(topicParentId).length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    if (includeMixed) {
      const mixedRef = doc(collection(db, 'subjects'))
      batch.set(mixedRef, { name: 'Mixed', parentId: itemRef.id, type: 'mixed', status: 'active', order: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
    }
    try { await batch.commit(); resetCreateForm(); setMessage('Topic created.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create topic.') }
  }
  async function createExam(event: FormEvent) {
    event.preventDefault()
    if (!canEdit || !examName.trim() || examQuestions.length === 0) return
    try {
      const examRef = examId ? doc(db, 'exams', examId) : doc(collection(db, 'exams'))
      await setDoc(examRef, { name: examName.trim(), description: examDescription.trim(), parentId: topicParentId || null, questions: examQuestions, status: 'created', updatedAt: serverTimestamp(), ...(examId ? {} : { createdAt: serverTimestamp() }) })
      setExamId(examRef.id)
      resetCreateForm()
      setMessage('Exam created and ready to publish.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create exam.') }
  }
  async function saveExamDraft() {
    if (!canEdit || !examName.trim()) return
    try {
      const examRef = examId ? doc(db, 'exams', examId) : doc(collection(db, 'exams'))
      await setDoc(examRef, { name: examName.trim(), description: examDescription.trim(), parentId: topicParentId || null, questions: examQuestions, status: 'draft', updatedAt: serverTimestamp(), ...(examId ? {} : { createdAt: serverTimestamp() }) })
      setExamId(examRef.id)
      setMessage('Exam draft saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save exam draft.') }
  }
  async function reviewExamQuestions() {
    if (!examFile) return
    try {
      const text = await examFile.text()
      const [headerLine, ...rows] = text.split(/\r?\n/).filter((line) => line.trim())
      const headers = headerLine.split(',').map((header) => header.trim())
      const questions = rows.map((row) => {
        const values = row.split(',')
        return Object.fromEntries(headers.map((header, index) => [header, (values[index] || '').trim()]))
      })
      setExamQuestions(questions)
      setExamStatus('created')
      setMessage(`${questions.length} questions loaded. Review complete.`)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to review questions CSV.') }
  }
  async function publishExam() {
    if (examStatus !== 'created' || examQuestions.length === 0 || !examId) return
    try {
      await updateDoc(doc(db, 'exams', examId), { status: 'published', updatedAt: serverTimestamp() })
      setExamStatus('published')
      setMessage('Exam published.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to publish exam.') }
  }
  async function deleteItem(item: Subject) {
    if (!canEdit) return
    const descendantIds = new Set<string>([item.id])
    let changed = true
    while (changed) {
      changed = false
      items.forEach((candidate) => {
        if (candidate.parentId && descendantIds.has(candidate.parentId) && !descendantIds.has(candidate.id)) {
          descendantIds.add(candidate.id)
          changed = true
        }
      })
    }
    try {
      const batch = writeBatch(db)
      descendantIds.forEach((id) => batch.delete(doc(db, 'subjects', id)))
      await batch.commit()
      setSelectedItemId('')
      setViewItemId('')
      setMessage('Subject item deleted.')
      await load()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete subject item.') }
  }
  function renderTree(parent: string | null, depth = 0): ReactNode {
    const siblings = childrenOf(parent)
    return siblings.map((item) => {
      const hasChildren = childrenOf(item.id).length > 0
      const expanded = expandedIds.has(item.id)
      return <div key={item.id} className="subject-tree-item" style={{ marginLeft: depth * 20 }}><div className={`organizer-item ${selectedItemId === item.id ? 'selected-subject' : ''}`} onClick={(event) => { event.stopPropagation(); setSelectedItemId(item.id) }}><span className="subject-name">{hasChildren ? <button className="caret-button" title={expanded ? 'Collapse' : 'Expand'} onClick={(event) => { event.stopPropagation(); setExpandedIds((current) => { const next = new Set(current); if (next.has(item.id)) next.delete(item.id); else next.add(item.id); return next }) }}>{expanded ? '⌄' : '›'}</button> : <span className="caret-placeholder" />}{item.name}</span></div>{expanded && renderTree(item.id, depth + 1)}</div>
    })
  }
  const viewedItem = items.find((item) => item.id === viewItemId)
  const viewedParent = viewedItem?.parentId ? items.find((item) => item.id === viewedItem.parentId) : undefined
  return <div className="stack" onClick={() => setActionOpen(false)}><div className="card"><div className="subject-heading"><div><h3>Subjects</h3><p>Create and organize subjects, topics, and exams.</p></div><div className="subject-action-menu" onClick={(event) => event.stopPropagation()}><button className="secondary" onClick={() => setActionOpen((open) => !open)} aria-expanded={actionOpen}>Actions ▾</button>{actionOpen && <div className="dropdown">{canEdit && <><button onClick={() => openCreateView('subject')}>Create subject</button><button disabled={!selectedItemId} onClick={() => openCreateView('topic', selectedItemId)}>Create topic</button></>}<button disabled={!selectedItemId} onClick={() => { setViewItemId(selectedItemId); setCreateView(null); setActionOpen(false) }}>View</button>{canEdit && <button disabled={!selectedItemId} className="delete-action" onClick={() => { const item = items.find((candidate) => candidate.id === selectedItemId); setActionOpen(false); if (item) void deleteItem(item) }}>Delete</button>}</div>}</div></div>{!canEdit && <p className="notice">Admin access is read-only. Only Super Admins can create subject items.</p>}{createView === 'subject' && <form className="form create-metadata-form" onSubmit={createItem}><h3>Create subject</h3><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="checkbox"><input type="checkbox" checked={includeMixed} onChange={(event) => setIncludeMixed(event.target.checked)} />Create Mixed section as a subtopic</label><div className="row"><button type="submit">Create subject</button><button type="button" className="secondary" onClick={resetCreateForm}>Cancel</button></div></form>}{createView === 'topic' && <form className="form create-metadata-form" onSubmit={createTopic}><h3>Create topic</h3><label>Parent Name<input value={items.find((item) => item.id === topicParentId)?.name || ''} readOnly /></label><label>Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} /></label><label className="checkbox"><input type="checkbox" checked={includeMixed} onChange={(event) => setIncludeMixed(event.target.checked)} />Create Mixed section as a subtopic</label><div className="row"><button type="submit">Create topic</button><button type="button" className="secondary" onClick={resetCreateForm}>Back</button></div></form>}{createView === 'exam' && <form className="form create-metadata-form" onSubmit={createExam}><h3>Create exam</h3><label>Topic<input value={items.find((item) => item.id === topicParentId)?.name || ""} readOnly /></label><label>Exam Name<input required value={examName} onChange={(event) => setExamName(event.target.value)} /></label><label>Description<textarea value={examDescription} onChange={(event) => setExamDescription(event.target.value)} /></label><label>Upload questions CSV<input type="file" accept=".csv,text/csv" onChange={(event) => setExamFile(event.target.files?.[0] || null)} /></label><div className="row"><button type="button" className="secondary" onClick={() => void saveExamDraft()}>Draft</button><button type="button" onClick={() => void reviewExamQuestions()} disabled={!examFile}>Review</button><button type="submit" disabled={examStatus !== "created" || examQuestions.length === 0}>Create exam</button><button type="button" disabled={examStatus !== "created"} onClick={() => void publishExam()}>Publish</button><button type="button" className="secondary" onClick={resetCreateForm}>Cancel</button></div>{examQuestions.length > 0 && <p className="notice">{examQuestions.length} questions loaded. Status: {examStatus}.</p>}</form>}{viewItemId && viewedItem && !createView && <div className="metadata-view"><h3>{viewedItem.name}</h3><dl><dt>Parent Name</dt><dd>{viewedParent?.name || 'None'}</dd><dt>Type</dt><dd>{viewedItem.type || 'subject'}</dd><dt>Description</dt><dd>{viewedItem.description || '—'}</dd><dt>Status</dt><dd>{viewedItem.status || 'active'}</dd></dl><div className="row"><button onClick={() => openCreateView('exam', viewedItem.id)}>Create exam</button><button className="secondary" onClick={() => setViewItemId('')}>Back to subjects</button></div></div>}{message && <p className="notice">{message}</p>}</div>{!createView && !viewItemId && <div className="card subject-tree" onClick={() => setSelectedItemId('')}>{renderTree(null)}{childrenOf(null).length === 0 && <p>No subjects created yet.</p>}</div>}</div>
}

function FileOrganizer() {
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [examName, setExamName] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [chapterName, setChapterName] = useState('')
  const [selectedExamId, setSelectedExamId] = useState('')
  const [selectedSubjectId, setSelectedSubjectId] = useState('')
  const [message, setMessage] = useState('')
  const load = async () => {
    const [examSnapshot, subjectSnapshot, chapterSnapshot] = await Promise.all([
      getDocs(collection(db, 'exams')), getDocs(collection(db, 'subjects')), getDocs(collection(db, 'chapters')),
    ])
    setExams(examSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Exam)))
    setSubjects(subjectSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Subject)))
    setChapters(chapterSnapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Chapter)))
  }
  useEffect(() => { void load().catch(() => setMessage('Unable to load academic structure.')) }, [])
  async function createExam(event: FormEvent) {
    event.preventDefault()
    if (!examName.trim()) return
    try { await setDoc(doc(collection(db, 'exams')), { name: examName.trim(), status: 'active', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); setExamName(''); setMessage('Exam created.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create exam.') }
  }
  async function createSubject(event: FormEvent) {
    event.preventDefault()
    if (!selectedExamId || !subjectName.trim()) return
    try { await setDoc(doc(collection(db, 'subjects')), { examId: selectedExamId, name: subjectName.trim(), status: 'active', order: subjects.filter((item) => item.examId === selectedExamId).length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); setSubjectName(''); setMessage('Subject created.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create subject.') }
  }
  async function createChapter(event: FormEvent) {
    event.preventDefault()
    if (!selectedSubjectId || !chapterName.trim()) return
    try { await setDoc(doc(collection(db, 'chapters')), { subjectId: selectedSubjectId, name: chapterName.trim(), status: 'active', order: chapters.filter((item) => item.subjectId === selectedSubjectId).length, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }); setChapterName(''); setMessage('Chapter created.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to create chapter.') }
  }
  async function remove(collectionName: 'exams' | 'subjects' | 'chapters', id: string) {
    try { await deleteDoc(doc(db, collectionName, id)); setMessage('Item deleted.'); await load() }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to delete item.') }
  }
  const selectedSubjects = subjects.filter((item) => item.examId === selectedExamId)
  const selectedChapters = chapters.filter((item) => item.subjectId === selectedSubjectId)
  return <div className="stack"><div className="card"><h3>Exams</h3><form className="row" onSubmit={createExam}><input placeholder="Exam name" value={examName} onChange={(event) => setExamName(event.target.value)} /><button>Add exam</button></form><div className="organizer-list">{exams.map((exam) => <div className="organizer-item" key={exam.id}><span>{exam.name}</span><button className="small-button secondary" onClick={() => void remove('exams', exam.id)}>Delete</button></div>)}</div></div><div className="card"><h3>Subjects</h3><form className="row" onSubmit={createSubject}><select required value={selectedExamId} onChange={(event) => { setSelectedExamId(event.target.value); setSelectedSubjectId('') }}><option value="">Select exam</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.name}</option>)}</select><input placeholder="Subject name" value={subjectName} onChange={(event) => setSubjectName(event.target.value)} /><button>Add subject</button></form><div className="organizer-list">{selectedSubjects.map((subject) => <div className="organizer-item" key={subject.id}><span>{subject.name}</span><button className="small-button secondary" onClick={() => void remove('subjects', subject.id)}>Delete</button></div>)}</div></div><div className="card"><h3>Chapters / Topics</h3><form className="row" onSubmit={createChapter}><select required value={selectedSubjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}><option value="">Select subject</option>{selectedSubjects.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select><input placeholder="Chapter or topic name" value={chapterName} onChange={(event) => setChapterName(event.target.value)} /><button>Add chapter</button></form><div className="organizer-list">{selectedChapters.map((chapter) => <div className="organizer-item" key={chapter.id}><span>{chapter.name}</span><button className="small-button secondary" onClick={() => void remove('chapters', chapter.id)}>Delete</button></div>)}</div></div>{message && <p className="notice">{message}</p>}</div>
}

function Users() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [view, setView] = useState<'list' | 'create' | 'profile'>('list')
  const [selected, setSelected] = useState<UserRecord | null>(null)
  const [query, setQuery] = useState(''); const [roleFilter, setRoleFilter] = useState('all')
  const [form, setForm] = useState({ email: '', firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '' })
  const [message, setMessage] = useState('')
  const load = () => getDocs(collection(db, 'users')).then((s) => setUsers(s.docs.map((item) => ({ id: item.id, ...item.data() } as UserRecord))))
  useEffect(() => { void load() }, [])
  async function createUser(event: FormEvent) {
    event.preventDefault(); setMessage('Creating user…')
    if (!form.firstName.trim() || !form.email.trim()) {
      setMessage('Please fill in all required fields: first name and email.')
      return
    }; let secondary: Awaited<ReturnType<typeof import('firebase/app').initializeApp>> | undefined
    try {
      const firebaseApp = await import('firebase/app'); secondary = firebaseApp.initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
      const secondaryAuth = (await import('firebase/auth')).getAuth(secondary)
      const credential = await (await import('firebase/auth')).createUserWithEmailAndPassword(secondaryAuth, form.email, strongPassword())
      await setDoc(doc(db, 'users', credential.user.uid), { uid: credential.user.uid, email: credential.user.email, displayName: `${form.firstName} ${form.lastName}`.trim(), firstName: form.firstName, lastName: form.lastName, dateOfBirth: form.dateOfBirth, phoneNumber: form.phoneNumber, photoUrl: credential.user.photoURL, provider: 'password', role: 'admin', referralCode: makeReferralCode(), createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastLoginAt: serverTimestamp() })
      await sendPasswordResetEmail(auth, credential.user.email || form.email); setForm({ email: '', firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '' }); setMessage('Admin created. A password setup email was sent.'); await load()
    } catch (error) { setMessage(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`) }
    finally { if (secondary) await (await import('firebase/app')).deleteApp(secondary) }
  }
  if (view === 'profile' && selected) return <UserProfile user={selected} onBack={() => setView('list')} />
  if (view === 'create') return <div className="stack"><form className="card form" onSubmit={createUser}><h3>Create admin</h3><p>A strong password is generated and a Firebase password setup email is sent.</p><div className="form-grid"><label><span className="field-label">First name <span className="required-mark">*</span></span><input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label><span className="field-label">Last name</span><input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label><label><span className="field-label">Email <span className="required-mark">*</span></span><input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label><label><span className="field-label">Phone number</span><input type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label><label><span className="field-label">Date of birth</span><input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></label><label><span className="field-label">Role</span><input value="Admin" disabled /></label></div><button className="compact-button">Create admin</button>{message && <p className="notice">{message}</p>}</form></div>
  const filtered = users.filter((item) => `${item.displayName || ''} ${item.email || ''}`.toLowerCase().includes(query.toLowerCase()) && (roleFilter === 'all' || item.role === roleFilter))
  return <div className="stack"><div className="toolbar"><input placeholder="Search name or email" value={query} onChange={(e) => setQuery(e.target.value)} /><select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}><option value="all">All roles</option><option value="user">Users</option><option value="admin">Admins</option></select><button onClick={() => { setMessage(''); setView('create') }}>Create admin</button></div><div className="card table-wrap"><table><thead><tr><th>First name</th><th>Last name</th><th>Email</th><th>Role</th><th>Phone number</th><th>Actions</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id}><td>{item.firstName || '—'}</td><td>{item.lastName || '—'}</td><td>{item.email || '—'}</td><td>{item.role || 'user'}</td><td>{item.phoneNumber || '—'}</td><td><button className="small-button" onClick={() => { setSelected(item); setView('profile') }}>View profile</button></td></tr>)}</tbody></table>{filtered.length === 0 && <p>No matching users found.</p>}</div></div>
}

function UserProfile({ user, onBack }: { user: UserRecord; onBack: () => void }) {
  const [message, setMessage] = useState('')
  async function resetPassword() { if (!user.email) return; try { await sendPasswordResetEmail(auth, user.email); setMessage('Password reset email sent.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send password reset email.') } }
  return <div className="stack"><button className="secondary" onClick={onBack}>← Back to users</button><div className="card profile-details"><h2>{user.displayName || 'User profile'}</h2><dl>{[['First name', user.firstName], ['Last name', user.lastName], ['Email', user.email], ['Phone', user.phoneNumber], ['Date of birth', user.dateOfBirth], ['userId', user.uid || user.id], ['Role', user.role || 'user'], ['Provider', user.provider], ['Referral code', user.referralCode]].map(([label, value]) => <><dt key={`${label}-dt`}>{label}</dt><dd key={`${label}-dd`}>{value || '—'}</dd></>)}</dl><button onClick={resetPassword} disabled={!user.email}>Send password reset email</button>{message && <p className="notice">{message}</p>}</div></div>
}

function Courses() {
  const [courses, setCourses] = useState<Course[]>([])
  useEffect(() => { getDocs(collection(db, 'courses')).then((s) => setCourses(s.docs.map((item) => ({ id: item.id, ...item.data() } as Course)))) }, [])
  async function save(course: Course) {
    await updateDoc(doc(db, 'courses', course.id), { offer: course.offer || '', active: course.active !== false, updatedAt: serverTimestamp() })
    setCourses((items) => items.map((item) => item.id === course.id ? course : item))
  }
  return <div className="stack">{courses.length === 0 && <div className="card"><p>No courses found. Add course documents to the <code>courses</code> collection.</p></div>}{courses.map((course) => <div className="card row course" key={course.id}><div><h3>{course.title}</h3><small>{course.id}</small></div><input value={course.offer || ''} placeholder="Offer, e.g. 20% off" onChange={(e) => setCourses((items) => items.map((item) => item.id === course.id ? { ...item, offer: e.target.value } : item))} /><button onClick={() => save(course)}>Save offer</button></div>)}</div>
}

function Tests() {
  const [tests, setTests] = useState<Test[]>([]); const [message, setMessage] = useState('')
  useEffect(() => { getDocs(collection(db, 'tests')).then((s) => setTests(s.docs.map((item) => ({ id: item.id, ...item.data() } as Test)))).catch((error) => setMessage(error instanceof Error ? error.message : 'Unable to load tests.')) }, [])
  async function save(test: Test) {
    try { await updateDoc(doc(db, 'tests', test.id), { title: test.title || 'Untitled test', courseId: test.courseId || '', active: test.active !== false, questionCount: Number(test.questionCount) || 0, updatedAt: serverTimestamp() }); setMessage('Test saved.') }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to save test.') }
  }
  return <div className="stack">{message && <p className="notice">{message}</p>}{tests.length === 0 && <div className="card"><p>No tests found. Add test documents to the <code>tests</code> collection.</p></div>}{tests.map((test) => <div className="card row test" key={test.id}><div><h3>{test.title || 'Untitled test'}</h3><small>{test.id}</small></div><input value={test.courseId || ''} placeholder="Course ID" onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, courseId: e.target.value } : item))} /><input type="number" min="0" value={test.questionCount || 0} aria-label="Question count" onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, questionCount: Number(e.target.value) } : item))} /><label className="checkbox"><input type="checkbox" checked={test.active !== false} onChange={(e) => setTests((items) => items.map((item) => item.id === test.id ? { ...item, active: e.target.checked } : item))} /> Active</label><button onClick={() => save(test)}>Save</button></div>)}</div>
}

function Profile({ user }: { user: AdminUser }) {
  const [form, setForm] = useState({ firstName: user.displayName?.split(' ')[0] || '', lastName: user.displayName?.split(' ').slice(1).join(' ') || '', phoneNumber: '', district: '', state: '', photoUrl: user.photoURL || '' })
  const [message, setMessage] = useState(''); const [uploading, setUploading] = useState(false)
  useEffect(() => { if (!user.uid) return; getDoc(doc(db, 'users', user.uid)).then((s) => { if (s.exists()) { const data = s.data() as UserRecord; setForm((current) => ({ ...current, firstName: data.firstName || current.firstName, lastName: data.lastName || current.lastName, phoneNumber: data.phoneNumber || '', district: data.district || '', state: data.state || '', photoUrl: data.photoUrl || current.photoUrl })) } }).catch(() => setMessage('Unable to load profile details.')) }, [user.uid])
  async function saveProfile(event: FormEvent) { event.preventDefault(); if (!user.uid) return; try { await updateDoc(doc(db, 'users', user.uid), { ...form, displayName: `${form.firstName} ${form.lastName}`.trim(), updatedAt: serverTimestamp() }); setMessage('Profile updated.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to update profile.') } }
  async function resetPassword() { if (!user.email) { setMessage('No email address is available for this account.'); return } try { await sendPasswordResetEmail(auth, user.email); setMessage('Password reset email sent.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send password reset email.') } }
  async function uploadPhoto(file: File) { if (!user.uid) return; if (!file.type.startsWith('image/')) { setMessage('Please select an image file.'); return } if (file.size > 5 * 1024 * 1024) { setMessage('Profile pictures must be 5 MB or smaller.'); return } setUploading(true); try { const photoRef = ref(storage, `users/${user.uid}/profile-picture`); await uploadBytes(photoRef, file, { contentType: file.type }); const photoUrl = await getDownloadURL(photoRef); await updateDoc(doc(db, 'users', user.uid), { photoUrl, updatedAt: serverTimestamp() }); setForm((current) => ({ ...current, photoUrl })); setMessage('Profile picture updated.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to upload profile picture.') } finally { setUploading(false) } }
  return <form className="card profile-details form" onSubmit={saveProfile}><div className="profile-heading"><div className="avatar-upload"><Avatar user={{ ...user, photoURL: form.photoUrl }} /><label className="avatar-edit" title="Upload profile picture"><span>✎</span><input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const file = e.target.files?.[0]; if (file) void uploadPhoto(file); e.currentTarget.value = '' }} /></label></div><div><h2>{user.displayName || 'Admin profile'}</h2><p>{user.email || 'No email available'}</p></div></div><div className="form-grid"><label>First name<input required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></label><label>Last name<input required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></label><label className="full-width">Email<input value={user.email || ''} readOnly /></label><label>Phone number<input type="tel" value={form.phoneNumber} onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })} /></label><label>District<input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} /></label><label>State<input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} /></label></div><div className="profile-actions"><button type="submit">Save profile</button><button type="button" className="secondary" onClick={resetPassword}>Reset password</button></div>{message && <p className="notice">{message}</p>}</form>
}
