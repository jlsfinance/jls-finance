// File: src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAn2-G8F9v1s2g3h4j5k6l7m8n9o0p1q2r",
  authDomain: "jls-finance-company.firebaseapp.com",
  projectId: "jls-finance-company",
  storageBucket: "jls-finance-company.appspot.com",
  messagingSenderId: "550122742532",
  appId: "1:550122742532:web:542c5c87803b3d112ce651"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
