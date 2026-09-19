import { doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { db, storage } from '../core/firebase'
import type { UserRecord } from '../core/types'

export type AdminProfileFields = Pick<UserRecord, 'firstName' | 'lastName' | 'phoneNumber' | 'district' | 'state' | 'photoUrl'>

export async function getAdminProfile(uid: string): Promise<AdminProfileFields | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null
  const data = snapshot.data() as UserRecord
  return { firstName: data.firstName, lastName: data.lastName, phoneNumber: data.phoneNumber, district: data.district, state: data.state, photoUrl: data.photoUrl }
}

export async function updateAdminProfile(uid: string, fields: { firstName: string; lastName: string; phoneNumber: string; district: string; state: string; photoUrl: string }): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { ...fields, displayName: `${fields.firstName} ${fields.lastName}`.trim(), updatedAt: serverTimestamp() })
}

export async function uploadAdminProfilePhoto(uid: string, file: File): Promise<string> {
  const photoRef = ref(storage, `users/${uid}/profile-picture`)
  await uploadBytes(photoRef, file, { contentType: file.type })
  const photoUrl = await getDownloadURL(photoRef)
  await updateDoc(doc(db, 'users', uid), { photoUrl, updatedAt: serverTimestamp() })
  return photoUrl
}
