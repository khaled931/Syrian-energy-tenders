import { FirebaseApp, FirebaseOptions, getApps, initializeApp } from "firebase/app";
import { Auth, getAuth } from "firebase/auth";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(firebaseConfig).every(Boolean);
// A configured bucket name does not mean Storage has been provisioned.
// Enable uploads only after deploying private rules and browser CORS.
export const isTenderFileUploadEnabled = isFirebaseConfigured
  && process.env.NEXT_PUBLIC_TENDER_FILE_UPLOADS_ENABLED === "true";

let app: FirebaseApp | null = null;

if (isFirebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
}

export const firebaseApp = app;
export const db: Firestore | null = app ? getFirestore(app) : null;
export const auth: Auth | null = app ? getAuth(app) : null;
export const storage: FirebaseStorage | null = app ? getStorage(app) : null;
