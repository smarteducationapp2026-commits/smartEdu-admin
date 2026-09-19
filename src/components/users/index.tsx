import { useEffect, useState, type FormEvent } from 'react'
import './users.css'
import type { UserRecord } from '../../core/types'
import { createAdminUser, listUsers } from '../../services/users'
import { IconButton } from '../shared/IconButton'
import { SearchInput } from '../shared/SearchInput'
import { UserProfile } from './UserProfile'

export function Users() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [view, setView] = useState<'list' | 'create' | 'profile'>('list')
  const [selected, setSelected] = useState<UserRecord | null>(null)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    phoneNumber: '',
  })
  const [message, setMessage] = useState('')
  const load = () => listUsers().then(setUsers)
  useEffect(() => {
    void load()
  }, [])
  async function createUser(event: FormEvent) {
    event.preventDefault()
    setMessage('Creating user…')
    if (!form.firstName.trim() || !form.email.trim()) {
      setMessage('Please fill in all required fields: first name and email.')
      return
    }
    try {
      await createAdminUser(form)
      setForm({ email: '', firstName: '', lastName: '', dateOfBirth: '', phoneNumber: '' })
      setMessage('Admin created. A password setup email was sent.')
      await load()
    } catch (error) {
      setMessage(
        `User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      )
    }
  }
  if (view === 'profile' && selected)
    return <UserProfile user={selected} onBack={() => setView('list')} onWalletChange={load} />
  if (view === 'create')
    return (
      <div className="stack">
        <form className="card form" onSubmit={createUser}>
          <h3>Create admin</h3>
          <p>A strong password is generated and a Firebase password setup email is sent.</p>
          <div className="form-grid">
            <label>
              <span className="field-label">
                First name <span className="required-mark">*</span>
              </span>
              <input
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Last name</span>
              <input
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">
                Email <span className="required-mark">*</span>
              </span>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Phone number</span>
              <input
                type="tel"
                value={form.phoneNumber}
                onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Date of birth</span>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
              />
            </label>
            <label>
              <span className="field-label">Role</span>
              <input value="Admin" disabled />
            </label>
          </div>
          <button className="compact-button">Create admin</button>
          {message && <p className="notice">{message}</p>}
        </form>
      </div>
    )
  const filtered = users.filter(
    (item) =>
      `${item.displayName || ''} ${item.email || ''}`.toLowerCase().includes(query.toLowerCase()) &&
      (roleFilter === 'all' || item.role === roleFilter),
  )
  return (
    <div className="stack">
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or email" />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All roles</option>
          <option value="user">Users</option>
          <option value="admin">Admins</option>
        </select>
        <button
          onClick={() => {
            setMessage('')
            setView('create')
          }}
        >
          Create admin
        </button>
      </div>
      <div className="card table-wrap">
        <table className="users-table">
          <thead>
            <tr>
              <th>First name</th>
              <th>Last name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Phone number</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id}>
                <td>{item.firstName || '—'}</td>
                <td>{item.lastName || '—'}</td>
                <td>{item.email || '—'}</td>
                <td>
                  <span className={`role-pill role-${item.role || 'user'}`}>
                    {item.role || 'user'}
                  </span>
                </td>
                <td>{item.phoneNumber || '—'}</td>
                <td>₹{item.walletBalance ?? 0}</td>
                <td>
                  <IconButton
                    icon="👁"
                    label="View profile"
                    className="table-icon-button"
                    onClick={() => {
                      setSelected(item)
                      setView('profile')
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p>No matching users found.</p>}
      </div>
    </div>
  )
}
