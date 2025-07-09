// File: src/lib/firebase.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getAuth, type Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let isFirebaseInitialized = false;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    try {
        app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        isFirebaseInitialized = true;
    } catch(e) {
        console.error("Failed to initialize Firebase", e);
    }
} else {
    console.warn("CRITICAL: Firebase configuration is missing or invalid. The application will not work without it. \n1. Create a `.env.local` file in the project root. \n2. Add your `NEXT_PUBLIC_` Firebase variables. \n3. RESTART the development server.");
}

export { db, storage, auth, isFirebaseInitialized };
