import { useState } from 'react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../../core/firebase'
import type { UserRecord } from '../../../core/types'

export function UserProfile({ user, onBack }: { user: UserRecord; onBack: () => void }) {
  const [message, setMessage] = useState('')
  async function resetPassword() { if (!user.email) return; try { await sendPasswordResetEmail(auth, user.email); setMessage('Password reset email sent.') } catch (error) { setMessage(error instanceof Error ? error.message : 'Unable to send password reset email.') } }
  return <div className="stack"><button className="back-link" onClick={onBack} aria-label="Back to users" title="Back to users">←</button><div className="card profile-details"><h2>{user.displayName || 'User profile'}</h2><dl>{[['First name', user.firstName], ['Last name', user.lastName], ['Email', user.email], ['Phone', user.phoneNumber], ['Date of birth', user.dateOfBirth], ['userId', user.uid || user.id], ['Role', user.role || 'user'], ['Provider', user.provider], ['Referral code', user.referralCode]].map(([label, value]) => <><dt key={`${label}-dt`}>{label}</dt><dd key={`${label}-dd`}>{value || '—'}</dd></>)}</dl><button onClick={resetPassword} disabled={!user.email}>Send password reset email</button>{message && <p className="notice">{message}</p>}</div></div>
}
