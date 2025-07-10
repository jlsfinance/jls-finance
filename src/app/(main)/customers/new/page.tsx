"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

// 🛡️ Zod Validation Schema
const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  voterId: z.string().optional(),
  photo: z
    .any()
    .refine((file) => file?.length > 0 && file[0]?.size > 0, "Photo is required"),

  guarantorName: z.string().optional(),
  guarantorMobile: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorRelation: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  // ✅ Upload to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "unsigned_preset"); // 🟡 replace with your actual unsigned preset

    const response = await fetch("https://api.cloudinary.com/v1_1/dxrf4saja/image/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.secure_url) {
      throw new Error("Upload failed");
    }

    return data.secure_url;
  };

  // ✅ Submit Handler
  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const file = data.photo[0];
      const photoURL = await uploadToCloudinary(file);

      await addDoc(collection(db, "customers"), {
        name: data.name,
        phone: data.phone,
        address: data.address,
        aadhaar: data.aadhaar || null,
        pan: data.pan || null,
        voterId: data.voterId || null,
        photo_url: photoURL,
        createdAt: new Date().toISOString(),
        guarantor: {
          name: data.guarantorName || null,
          mobile: data.guarantorMobile || null,
          address: data.guarantorAddress || null,
          relation: data.guarantorRelation || null,
        },
      });

      toast({ title: "Success", description: "Customer registered successfully" });
      router.push("/customers");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: error.message || "Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-6">
      <h1 className="text-2xl font-bold mb-4">Register New Customer</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Customer Fields */}
        <Input label="Name" {...form.register("name")} placeholder="Full Name" />
        <p className="text-sm text-red-500">{form.formState.errors.name?.message}</p>

        <Input label="Phone" {...form.register("phone")} placeholder="Phone Number" />
        <p className="text-sm text-red-500">{form.formState.errors.phone?.message}</p>

        <Textarea {...form.register("address")} placeholder="Address" />
        <p className="text-sm text-red-500">{form.formState.errors.address?.message}</p>

        <Input {...form.register("aadhaar")} placeholder="Aadhaar (optional)" />
        <Input {...form.register("pan")} placeholder="PAN (optional)" />
        <Input {...form.register("voterId")} placeholder="Voter ID (optional)" />

        <Input type="file" accept="image/*" {...form.register("photo")} />
        <p className="text-sm text-red-500">{form.formState.errors.photo?.message}</p>

        {/* Guarantor Section */}
        <h2 className="font-semibold pt-4">Guarantor Details (Optional)</h2>
        <Input {...form.register("guarantorName")} placeholder="Guarantor Name" />
        <Input {...form.register("guarantorMobile")} placeholder="Mobile Number" />
        <Textarea {...form.register("guarantorAddress")} placeholder="Address" />
        <Input {...form.register("guarantorRelation")} placeholder="Relation with Customer" />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Register Customer"}
        </Button>
      </form>
    </div>
  );
}
