// File: src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC49_jV4MSzJzS7qfA_yU5v8s1wO3T_R2g",
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
