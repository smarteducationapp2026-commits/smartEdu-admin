import { useEffect, useState, type FormEvent } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, firebaseConfig } from '../../../core/firebase'
import type { UserRecord } from '../../../core/types'
import { UserProfile } from './UserProfile'

const makeReferralCode = () => `SMART-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
const strongPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint32Array(24)), (value) => alphabet[value % alphabet.length]).join('')
}

export function Users() {
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
