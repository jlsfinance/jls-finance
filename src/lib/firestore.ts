// src/lib/firestore.ts
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"

export async function saveToFirestore(collectionName: string, data: any) {
  try {
    const docRef = await addDoc(collection(db, collectionName), {
      ...data,
      createdAt: new Date()
    })
    return { success: true, id: docRef.id }
  } catch (err) {
    console.error("❌ Firestore Save Error:", err)
    return { success: false, error: err }
  }
}
