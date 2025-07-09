"use client"

import { useState } from "react"
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function NewCustomerPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    mobile: "",
    aadhaar: "",
    voterId: "",
    pan: "",
    guarantorName: "",
    guarantorMobile: "",
    guarantorAddress: "",
    guarantorRelation: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "customers"), {
        ...formData,
        createdAt: new Date(),
      });
      alert("✅ Customer saved successfully!");
    } catch (error) {
      console.error("❌ Error saving customer:", error);
      alert("❌ Failed to save customer");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6 space-y-4">
      <h2 className="text-xl font-semibold">New Customer</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input name="name" placeholder="Name" onChange={handleChange} required />
        <Input name="email" type="email" placeholder="Email" onChange={handleChange} required />
        <Input name="mobile" placeholder="Mobile Number" onChange={handleChange} required />
        <Input name="aadhaar" placeholder="Aadhaar Number" onChange={handleChange} required />
        <Input name="voterId" placeholder="Voter ID" onChange={handleChange} />
        <Input name="pan" placeholder="PAN Number" onChange={handleChange} />

        <h3 className="mt-4 font-medium">Guarantor Details</h3>
        <Input name="guarantorName" placeholder="Guarantor Name" onChange={handleChange} />
        <Input name="guarantorMobile" placeholder="Guarantor Mobile" onChange={handleChange} />
        <Input name="guarantorAddress" placeholder="Guarantor Address" onChange={handleChange} />
        <Input name="guarantorRelation" placeholder="Relation with Customer" onChange={handleChange} />

        <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700">
          Save Customer
        </Button>
      </form>
    </div>
  );
}
