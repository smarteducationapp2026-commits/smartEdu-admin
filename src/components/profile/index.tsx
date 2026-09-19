import { useEffect, useState, type FormEvent } from 'react'
import type { AdminUser } from '../../core/types'
import { sendPasswordReset } from '../../services/auth'
import {
  getAdminProfile,
  updateAdminProfile,
  uploadAdminProfilePhoto,
} from '../../services/profile'
import { Avatar } from '../shared/Avatar'

export function Profile({ user }: { user: AdminUser }) {
  const [form, setForm] = useState({
    firstName: user.displayName?.split(' ')[0] || '',
    lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
    phoneNumber: '',
    district: '',
    state: '',
    photoUrl: user.photoURL || '',
  })
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)
  useEffect(() => {
    if (!user.uid) return
    void getAdminProfile(user.uid)
      .then((data) => {
        if (data)
          setForm((current) => ({
            ...current,
            firstName: data.firstName || current.firstName,
            lastName: data.lastName || current.lastName,
            phoneNumber: data.phoneNumber || '',
            district: data.district || '',
            state: data.state || '',
            photoUrl: data.photoUrl || current.photoUrl,
          }))
      })
      .catch(() => setMessage('Unable to load profile details.'))
  }, [user.uid])
  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    if (!user.uid) return
    try {
      await updateAdminProfile(user.uid, form)
      setMessage('Profile updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update profile.')
    }
  }
  async function resetPassword() {
    if (!user.email) {
      setMessage('No email address is available for this account.')
      return
    }
    try {
      await sendPasswordReset(user.email)
      setMessage('Password reset email sent.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send password reset email.')
    }
  }
  async function uploadPhoto(file: File) {
    if (!user.uid) return
    if (!file.type.startsWith('image/')) {
      setMessage('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Profile pictures must be 5 MB or smaller.')
      return
    }
    setUploading(true)
    try {
      const photoUrl = await uploadAdminProfilePhoto(user.uid, file)
      setForm((current) => ({ ...current, photoUrl }))
      setMessage('Profile picture updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to upload profile picture.')
    } finally {
      setUploading(false)
    }
  }
  return (
    <form className="card profile-details form" onSubmit={saveProfile}>
      <div className="profile-heading">
        <div className="avatar-upload">
          <Avatar user={{ ...user, photoURL: form.photoUrl }} />
          <label className="avatar-edit" title="Upload profile picture">
            <span>✎</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void uploadPhoto(file)
                e.currentTarget.value = ''
              }}
            />
          </label>
        </div>
        <div>
          <h2>{user.displayName || 'Admin profile'}</h2>
          <p>{user.email || 'No email available'}</p>
        </div>
      </div>
      <div className="form-grid">
        <label>
          First name
          <input
            required
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
        </label>
        <label>
          Last name
          <input
            required
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
        </label>
        <label className="full-width">
          Email
          <input value={user.email || ''} readOnly />
        </label>
        <label>
          Phone number
          <input
            type="tel"
            value={form.phoneNumber}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
        </label>
        <label>
          District
          <input
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
          />
        </label>
        <label>
          State
          <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        </label>
      </div>
      <div className="profile-actions">
        <button type="submit">Save profile</button>
        <button type="button" className="secondary" onClick={resetPassword}>
          Reset password
        </button>
      </div>
      {message && <p className="notice">{message}</p>}
    </form>
  )
}
