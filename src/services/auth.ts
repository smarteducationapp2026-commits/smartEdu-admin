import {
  browserLocalPersistence, onAuthStateChanged, sendPasswordResetEmail, setPersistence,
  signInWithEmailAndPassword, signOut, type User, type Unsubscribe,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../core/firebase'

export type AdminRole = 'admin' | 'superAdmin'

export async function getAdminRole(uid: string): Promise<AdminRole | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null
  const role = snapshot.data().role
  return role === 'admin' || role === 'superAdmin' ? role : null
}

export function watchAuthState(onChange: (user: User | null) => void): Unsubscribe {
  setPersistence(auth, browserLocalPersistence).catch(() => undefined)
  return onAuthStateChanged(auth, onChange)
}

export async function signInAdmin(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(auth, email, password)
}

export async function signOutAdmin(): Promise<void> {
  await signOut(auth)
}

export async function sendPasswordReset(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email)
}
