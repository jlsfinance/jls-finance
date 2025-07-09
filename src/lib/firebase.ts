// File: src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB52JnNNz8ul7lajtCzhdQoC9zKr_ynk-Y",
  authDomain: "jls-finance-company.firebaseapp.com",
  projectId: "jls-finance-company",
  storageBucket: "jls-finance-company.firebasestorage.app",
  messagingSenderId: "550122742532",
  appId: "1:550122742532:web:542c5c87803b3d112ce651"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
