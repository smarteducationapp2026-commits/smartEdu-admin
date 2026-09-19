import { collection, doc, getDocs, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db, firebaseConfig } from '../core/firebase'
import type { UserRecord } from '../core/types'
import { sendPasswordReset } from './auth'

const makeReferralCode = () => `SMART-${crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()}`
const strongPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*'
  return Array.from(crypto.getRandomValues(new Uint32Array(24)), (value) => alphabet[value % alphabet.length]).join('')
}

export async function listUsers(): Promise<UserRecord[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as UserRecord))
}

export type NewAdminForm = { email: string; firstName: string; lastName: string; dateOfBirth: string; phoneNumber: string }

// Admin creation uses a secondary, throwaway Firebase app instance so creating the
// new user's auth account doesn't sign the current admin out of their own session.
export async function createAdminUser(form: NewAdminForm): Promise<void> {
  let secondary: Awaited<ReturnType<typeof import('firebase/app').initializeApp>> | undefined
  try {
    const firebaseApp = await import('firebase/app')
    secondary = firebaseApp.initializeApp(firebaseConfig, `admin-create-${Date.now()}`)
    const secondaryAuth = (await import('firebase/auth')).getAuth(secondary)
    const credential = await (await import('firebase/auth')).createUserWithEmailAndPassword(secondaryAuth, form.email, strongPassword())
    await setDoc(doc(db, 'users', credential.user.uid), {
      uid: credential.user.uid,
      email: credential.user.email,
      displayName: `${form.firstName} ${form.lastName}`.trim(),
      firstName: form.firstName,
      lastName: form.lastName,
      dateOfBirth: form.dateOfBirth,
      phoneNumber: form.phoneNumber,
      photoUrl: credential.user.photoURL,
      provider: 'password',
      role: 'admin',
      referralCode: makeReferralCode(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    })
    await sendPasswordReset(credential.user.email || form.email)
  } finally {
    if (secondary) await (await import('firebase/app')).deleteApp(secondary)
  }
}

export async function addWalletMoney(userId: string, amount: number): Promise<number> {
  const userRef = doc(db, 'users', userId)
  const txRef = doc(collection(db, 'walletTransactions'))
  let balanceAfter = 0
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(userRef)
    balanceAfter = ((snap.data()?.walletBalance as number) ?? 0) + amount
    transaction.update(userRef, { walletBalance: balanceAfter })
    transaction.set(txRef, {
      uid: userId,
      type: 'admin_credit',
      direction: 'credit',
      amount,
      balanceAfter,
      description: 'Added by admin',
      createdBy: auth.currentUser?.email ?? '',
      createdAt: serverTimestamp(),
    })
  })
  return balanceAfter
}
