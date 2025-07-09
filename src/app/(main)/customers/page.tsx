"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function NewCustomerPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    aadhaar: "",
    pan: "",
    status: "Active",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from("customers").insert([{
        ...formData,
        created_at: new Date(),
      }])

      if (error) throw error

      alert("✅ ग्राहक सफलतापूर्वक सेव हो गया")
      router.push("/customers")
    } catch (error) {
      console.error("Error saving customer:", error)
      alert("❌ ग्राहक सेव नहीं हो पाया")
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h2 className="text-2xl font-semibold mb-6">नया ग्राहक जोड़ें</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          name="name"
          placeholder="नाम"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <Input
          name="email"
          type="email"
          placeholder="ईमेल"
          value={formData.email}
          onChange={handleChange}
          required
        />
        <Input
          name="mobile"
          placeholder="मोबाइल नंबर"
          value={formData.mobile}
          onChange={handleChange}
          required
        />
        <Input
          name="aadhaar"
          placeholder="आधार नंबर"
          value={formData.aadhaar}
          onChange={handleChange}
          required
        />
        <Input
          name="pan"
          placeholder="PAN नंबर"
          value={formData.pan}
          onChange={handleChange}
          required
        />

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">
          ग्राहक सेव करें
        </Button>
      </form>
    </div>
  )
}
