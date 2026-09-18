import { useEffect, useState } from 'react'
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'
import { db } from '../../../core/firebase'
import type { UserRecord, WalletTransaction } from '../../../core/types'
// import { httpsCallable } from 'firebase/functions'
// import { functions } from '../../../core/firebase'

const fmtDate = (ts?: { seconds?: number }) => (ts?.seconds ? new Date(ts.seconds * 1000).toLocaleString() : '—')

export function Wallet() {
  const [users, setUsers] = useState<UserRecord[]>([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  const loadUsers = () =>
    getDocs(collection(db, 'users')).then((snapshot) =>
      setUsers(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as UserRecord)),
    )
  useEffect(() => { void loadUsers() }, [])

  const loadTransactions = async (uid: string) => {
    setLoadingTx(true)
    const snapshot = await getDocs(
      query(collection(db, 'walletTransactions'), where('uid', '==', uid), orderBy('createdAt', 'desc')),
    )
    setTransactions(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as WalletTransaction))
    setLoadingTx(false)
  }

  const openUser = (user: UserRecord) => {
    setSelectedId(user.id)
    void loadTransactions(user.id)
  }

  // Manual credit/debit calls the adminAdjustWallet Cloud Function, which
  // requires the Firebase Blaze plan (this project is currently on Spark).
  // Re-enable this along with functions/src/wallet.ts once Blaze is on.
  //
  // const [form, setForm] = useState({ amount: '', direction: 'credit' as 'credit' | 'debit', reason: '' })
  // const [message, setMessage] = useState('')
  // const [submitting, setSubmitting] = useState(false)
  //
  // async function submitAdjustment(event: FormEvent) {
  //   event.preventDefault()
  //   if (!selectedId) return
  //   const amountRupees = Number(form.amount)
  //   if (!amountRupees || amountRupees <= 0) { setMessage('Enter a valid amount.'); return }
  //   if (!form.reason.trim()) { setMessage('Enter a reason for this adjustment.'); return }
  //
  //   setSubmitting(true)
  //   setMessage('Saving…')
  //   try {
  //     const adjustWallet = httpsCallable(functions, 'adminAdjustWallet')
  //     await adjustWallet({ targetUid: selectedId, amountRupees, direction: form.direction, reason: form.reason.trim() })
  //     setMessage('Wallet updated.')
  //     setForm({ amount: '', direction: 'credit', reason: '' })
  //     await Promise.all([loadUsers(), loadTransactions(selectedId)])
  //   } catch (error) {
  //     setMessage(error instanceof Error ? error.message : 'Unable to update wallet.')
  //   } finally {
  //     setSubmitting(false)
  //   }
  // }

  const selected = users.find((item) => item.id === selectedId)
  if (selected) {
    return <div className="stack">
      <button className="back-link" onClick={() => setSelectedId(null)} aria-label="Back to wallet list" title="Back to wallet list">←</button>
      <div className="card profile-details">
        <h2>{selected.displayName || selected.email || 'User wallet'}</h2>
        <p>Current balance: <strong>₹{selected.walletBalance ?? 0}</strong></p>
      </div>
      <div className="card form">
        <h3>Adjust balance</h3>
        <p className="notice">Manual credit/debit is disabled until Cloud Functions (Blaze plan) are enabled.</p>
      </div>
      {/*
      <div className="card form">
        <h3>Adjust balance</h3>
        <form className="form-grid" onSubmit={submitAdjustment}>
          <label>
            <span className="field-label">Direction</span>
            <select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as 'credit' | 'debit' })}>
              <option value="credit">Credit (add)</option>
              <option value="debit">Debit (deduct)</option>
            </select>
          </label>
          <label>
            <span className="field-label">Amount (₹) <span className="required-mark">*</span></span>
            <input type="number" min="1" step="1" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label>
            <span className="field-label">Reason <span className="required-mark">*</span></span>
            <input required value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Refund for cancelled course" />
          </label>
          <button className="compact-button" disabled={submitting}>{submitting ? 'Saving…' : 'Apply adjustment'}</button>
        </form>
        {message && <p className="notice">{message}</p>}
      </div>
      */}
      <div className="card table-wrap">
        <h3>Transaction history</h3>
        {loadingTx
          ? <p>Loading…</p>
          : <table>
            <thead><tr><th>Date</th><th>Type</th><th>Direction</th><th>Amount</th><th>Balance after</th><th>Description</th><th>By</th></tr></thead>
            <tbody>
              {transactions.map((tx) => <tr key={tx.id}>
                <td>{fmtDate(tx.createdAt)}</td>
                <td>{tx.type}</td>
                <td>{tx.direction}</td>
                <td>₹{tx.amount}</td>
                <td>{tx.balanceAfter ?? '—'}</td>
                <td>{tx.description || '—'}</td>
                <td>{tx.createdBy || '—'}</td>
              </tr>)}
            </tbody>
          </table>}
        {!loadingTx && transactions.length === 0 && <p>No transactions yet.</p>}
      </div>
    </div>
  }

  const filtered = users.filter((item) =>
    `${item.displayName || ''} ${item.email || ''}`.toLowerCase().includes(search.toLowerCase()),
  )
  return <div className="stack">
    <div className="toolbar"><input placeholder="Search name or email" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
    <div className="card table-wrap">
      <table>
        <thead><tr><th>Name</th><th>Email</th><th>Balance</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((item) => <tr key={item.id}>
            <td>{item.displayName || '—'}</td>
            <td>{item.email || '—'}</td>
            <td>₹{item.walletBalance ?? 0}</td>
            <td><button className="small-button" onClick={() => openUser(item)}>Manage wallet</button></td>
          </tr>)}
        </tbody>
      </table>
      {filtered.length === 0 && <p>No matching users found.</p>}
    </div>
  </div>
}
