import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
// import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const requiredConfig = {
  VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY,
  VITE_FIREBASE_AUTH_DOMAIN: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  VITE_FIREBASE_STORAGE_BUCKET: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  VITE_FIREBASE_MESSAGING_SENDER_ID: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  VITE_FIREBASE_APP_ID: import.meta.env.VITE_FIREBASE_APP_ID,
}

const missingConfig = Object.entries(requiredConfig)
  .filter(([, value]) => !value || value.startsWith('your_'))
  .map(([name]) => name)

if (missingConfig.length > 0) {
  throw new Error(
    `Missing Firebase web configuration: ${missingConfig.join(', ')}. ` +
      'Create smartEdu-admin/.env from .env.example with the Web app settings ' +
      'from the smarteducation-705f1 Firebase project, then restart Vite.',
  )
}

export const firebaseConfig = {
  apiKey: requiredConfig.VITE_FIREBASE_API_KEY,
  authDomain: requiredConfig.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: requiredConfig.VITE_FIREBASE_PROJECT_ID,
  storageBucket: requiredConfig.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: requiredConfig.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: requiredConfig.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Cloud Functions require the Firebase Blaze plan (this project is currently
// on Spark), so adminAdjustWallet is disabled — see Wallet.tsx. Uncomment
// once Blaze is enabled and functions/src/wallet.ts is re-enabled.
// export const functions = getFunctions(app)
