"use client";

import { useEffect, useState } from "react";
import { isFirebaseInitialized, db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";

export default function FirebaseTestPage() {
  const [status, setStatus] = useState("Checking Firebase...");

  useEffect(() => {
    if (!isFirebaseInitialized) {
      setStatus("❌ Firebase not initialized");
      return;
    }

    const testFirestore = async () => {
      try {
        const snapshot = await getDocs(collection(db!, "users")); // change to any valid collection
        setStatus(`✅ Firebase is working. Fetched ${snapshot.size} users.`);
      } catch (err: any) {
        setStatus("❌ Firestore fetch failed: " + err.message);
      }
    };

    testFirestore();
  }, []);

  return <div className="p-4 text-xl">{status}</div>;
}
