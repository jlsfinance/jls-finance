"use client"
import { useState } from "react"
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export default function NewEMICollectionPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    loanId: "",
    customerId: "",
    amountPaid: "",
    paymentDate: "",
    paymentMode: "",
    remarks: ""
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, "emiCollections"), {
        ...formData,
        amountPaid: Number(formData.amountPaid),
        paymentDate: new Date(formData.paymentDate),
        createdAt: new Date()
      })
      alert("✅ EMI भुगतान सफलतापूर्वक सेव हो गया")
      router.push("/collections/due-list")
    } catch (error) {
      console.error("Error saving EMI:", error)
      alert("❌ EMI सेव नहीं हो पाया")
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">नई EMI संग्रह प्रविष्टि</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="loanId"
          placeholder="Loan ID"
          value={formData.loanId}
          onChange={handleChange}
          required
        />
        <Input
          name="customerId"
          placeholder="Customer ID"
          value={formData.customerId}
          onChange={handleChange}
          required
        />
        <Input
          name="amountPaid"
          type="number"
          placeholder="Amount Paid (₹)"
          value={formData.amountPaid}
          onChange={handleChange}
          required
        />
        <Input
          name="paymentDate"
          type="date"
          placeholder="Payment Date"
          value={formData.paymentDate}
          onChange={handleChange}
          required
        />
        <Input
          name="paymentMode"
          placeholder="Payment Mode (Cash, UPI, etc.)"
          value={formData.paymentMode}
          onChange={handleChange}
          required
        />
        <Input
          name="remarks"
          placeholder="Remarks (optional)"
          value={formData.remarks}
          onChange={handleChange}
        />

        <Button type="submit" className="w-full bg-purple-600 text-white hover:bg-purple-700">
          EMI सेव करें
        </Button>
      </form>
    </div>
  )
}
