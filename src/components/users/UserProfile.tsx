import { useState, type FormEvent } from 'react'
import type { UserRecord } from '../../core/types'
import { sendPasswordReset } from '../../services/auth'
import { addWalletMoney } from '../../services/users'
import { Avatar } from '../shared/Avatar'
import { BackHeading } from '../shared/BackHeading'

export function UserProfile({
  user,
  onBack,
  onWalletChange,
}: {
  user: UserRecord
  onBack: () => void
  onWalletChange?: () => void
}) {
  const [message, setMessage] = useState('')
  const [balance, setBalance] = useState(user.walletBalance ?? 0)
  const [amount, setAmount] = useState('')
  const [addingMoney, setAddingMoney] = useState(false)
  const [walletMessage, setWalletMessage] = useState('')

  async function resetPassword() {
    if (!user.email) return
    try {
      await sendPasswordReset(user.email)
      setMessage('Password reset email sent.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to send password reset email.')
    }
  }

  async function addMoney(event: FormEvent) {
    event.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setWalletMessage('Enter a valid amount.')
      return
    }
    const userId = user.uid || user.id
    setAddingMoney(true)
    setWalletMessage('Adding…')
    try {
      const balanceAfter = await addWalletMoney(userId, value)
      setBalance(balanceAfter)
      setAmount('')
      setWalletMessage('Money added.')
      onWalletChange?.()
    } catch (error) {
      setWalletMessage(error instanceof Error ? error.message : 'Unable to add money.')
    } finally {
      setAddingMoney(false)
    }
  }

  return (
    <div className="stack">
      <BackHeading title="User profile" onBack={onBack} label="Back to users" />
      <div className="card profile-details">
        <div className="profile-heading">
          <Avatar
            user={{
              photoURL: user.photoUrl ?? null,
              displayName: user.displayName ?? null,
              email: user.email ?? null,
            }}
          />
          <div>
            <h2>{user.displayName || 'Unnamed user'}</h2>
            <p>{user.email || 'No email available'}</p>
          </div>
        </div>
        <dl>
          {(
            [
              ['First name', user.firstName],
              ['Last name', user.lastName],
              ['Email', user.email],
              ['Phone', user.phoneNumber],
              ['Date of birth', user.dateOfBirth],
              ['userId', user.uid || user.id],
              ['Role', user.role || 'user'],
              ['Provider', user.provider],
              ['Referral code', user.referralCode],
            ] as const
          ).map(([label, value]) => (
            <>
              <dt key={`${label}-dt`}>{label}</dt>
              <dd key={`${label}-dd`}>{value || '—'}</dd>
            </>
          ))}
        </dl>
        <div className="profile-actions">
          <button onClick={resetPassword} disabled={!user.email}>
            Send password reset email
          </button>
        </div>
        {message && <p className="notice">{message}</p>}
      </div>
      <div className="card form wallet-card">
        <h3>Wallet</h3>
        <p className="wallet-balance">
          Current balance: <strong>₹{balance}</strong>
        </p>
        <form className="row" onSubmit={addMoney}>
          <input
            type="number"
            min="1"
            step="1"
            placeholder="Amount (₹)"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button className="compact-button" disabled={addingMoney}>
            {addingMoney ? 'Adding…' : 'Add money'}
          </button>
        </form>
        {walletMessage && <p className="notice">{walletMessage}</p>}
      </div>
    </div>
  )
}
