import { useEffect, useState, type FormEvent } from 'react'
import {
  browserLocalPersistence, onAuthStateChanged, setPersistence,
  signInWithEmailAndPassword, signOut, type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase'
import { Dashboard } from '../dashboard/Dashboard'
import '../../App.css'

async function getAdminRole(user: User): Promise<'admin' | 'superAdmin' | null> {
  const snapshot = await getDoc(doc(db, 'users', user.uid))
  if (!snapshot.exists()) return null
  const role = snapshot.data().role
  return role === 'admin' || role === 'superAdmin' ? role : null
}

function Login({ error, onError }: { error: string; onError: (value: string) => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); onError('')
    try { await signInWithEmailAndPassword(auth, email, password) }
    catch { onError('Unable to sign in. Check your credentials and admin permissions.') }
    finally { setBusy(false) }
  }
  return <main className="center"><form className="card narrow form" onSubmit={submit}>
    <p className="eyebrow">SMARTEDU ADMIN</p><h1>Welcome back</h1><p>Sign in with your administrator account.</p>
    <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
    <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
    {error && <div className="error">{error}</div>}
    <button disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
  </form></main>
}

export function Auth() {
  const [user, setUser] = useState<User | null>(null)
  const [adminRole, setAdminRole] = useState<'admin' | 'superAdmin' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => undefined)
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser); setAdminRole(null)
      if (nextUser) {
        const role = await getAdminRole(nextUser)
        setAdminRole(role)
        if (!role) {
          setError('This account is not authorized for SmartEdu Admin.')
          await signOut(auth)
        }
      }
      setLoading(false)
    })
  }, [])
  if (loading) return <main className="center">Loading SmartEdu Admin…</main>
  if (!user) return <Login onError={setError} error={error} />
  if (!adminRole) return <main className="center"><section className="card narrow">
    <p className="eyebrow">SMARTEDU ADMIN</p><h1>Admin access required</h1>
    <p>Your account is signed in, but its Firestore profile is not an admin profile.</p><button onClick={() => signOut(auth)}>Sign out</button>
  </section></main>
  return <Dashboard user={user} role={adminRole} />
}
