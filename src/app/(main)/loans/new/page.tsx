"use client"
import { useState } from "react"
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"

export default function NewLoanPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    customerId: "",
    loanAmount: "",
    interestRate: "",
    tenureMonths: "",
    purpose: "",
    status: "pending",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await addDoc(collection(db, "loans"), {
        ...formData,
        loanAmount: Number(formData.loanAmount),
        interestRate: Number(formData.interestRate),
        tenureMonths: Number(formData.tenureMonths),
        createdAt: new Date()
      })
      alert("✅ लोन आवेदन सफलतापूर्वक सेव हो गया")
      router.push("/loans")
    } catch (error) {
      console.error("Error saving loan:", error)
      alert("❌ लोन सेव नहीं हो पाया")
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">नया लोन आवेदन</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="customerId"
          placeholder="Customer ID"
          value={formData.customerId}
          onChange={handleChange}
          required
        />
        <Input
          name="loanAmount"
          type="number"
          placeholder="Loan Amount (₹)"
          value={formData.loanAmount}
          onChange={handleChange}
          required
        />
        <Input
          name="interestRate"
          type="number"
          placeholder="Interest Rate (%)"
          value={formData.interestRate}
          onChange={handleChange}
          required
        />
        <Input
          name="tenureMonths"
          type="number"
          placeholder="Tenure (Months)"
          value={formData.tenureMonths}
          onChange={handleChange}
          required
        />
        <Input
          name="purpose"
          placeholder="Loan Purpose"
          value={formData.purpose}
          onChange={handleChange}
          required
        />

        <Button type="submit" className="w-full bg-green-600 text-white hover:bg-green-700">
          लोन सेव करें
        </Button>
      </form>
    </div>
  )
}
