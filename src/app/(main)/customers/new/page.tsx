"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

// ✅ Zod schema with Guarantor fields
const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  address: z.string().min(1, "Address is required"),
  aadhaar: z.string().optional(),
  pan: z.string().optional(),
  voterId: z.string().optional(),
  photo: z
    .any()
    .refine((file) => file && file.length > 0 && file[0]?.size > 0, "Photo is required"),
  guarantorName: z.string().optional(),
  guarantorMobile: z.string().optional(),
  guarantorAddress: z.string().optional(),
  guarantorRelation: z.string().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function CustomerRegistrationForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
  });

  // ✅ Upload to Cloudinary
  const uploadPhotoToCloudinary = async (photo: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", photo);
    formData.append("upload_preset", "unsigned_preset"); // ⛔ Replace with your actual preset name

    const res = await fetch("https://api.cloudinary.com/v1_1/dxrf4saja/image/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (!res.ok || !data.secure_url) {
      throw new Error("Photo upload failed");
    }

    return data.secure_url;
  };

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    try {
      const photoURL = await uploadPhotoToCloudinary(data.photo[0]);

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
          name: data.guarantorName || "",
          mobile: data.guarantorMobile || "",
          address: data.guarantorAddress || "",
          relation: data.guarantorRelation || "",
        },
      });

      toast({
        title: "Customer Registered",
        description: "Customer and guarantor details saved successfully.",
      });

      router.push("/customers");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message === "Photo upload failed"
            ? "Photo upload failed. Please try again."
            : "Network error occurred. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Register New Customer</h1>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Customer Fields */}
        <div>
          <label className="block text-sm font-medium">Full Name</label>
          <Input type="text" {...form.register("name")} placeholder="Enter full name" />
          <p className="text-red-500 text-sm">{form.formState.errors.name?.message}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Phone Number</label>
          <Input type="text" {...form.register("phone")} placeholder="Enter phone number" />
          <p className="text-red-500 text-sm">{form.formState.errors.phone?.message}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Address</label>
          <Textarea {...form.register("address")} placeholder="Enter address" />
          <p className="text-red-500 text-sm">{form.formState.errors.address?.message}</p>
        </div>

        <div>
          <label className="block text-sm font-medium">Aadhaar (Optional)</label>
          <Input type="text" {...form.register("aadhaar")} />
        </div>

        <div>
          <label className="block text-sm font-medium">PAN (Optional)</label>
          <Input type="text" {...form.register("pan")} />
        </div>

        <div>
          <label className="block text-sm font-medium">Voter ID (Optional)</label>
          <Input type="text" {...form.register("voterId")} />
        </div>

        <div>
          <label className="block text-sm font-medium">Upload Photo</label>
          <Input type="file" accept="image/*" {...form.register("photo")} />
          <p className="text-red-500 text-sm">{form.formState.errors.photo?.message}</p>
        </div>

        {/* Guarantor Fields */}
        <div className="border-t pt-4 mt-6">
          <h2 className="text-lg font-semibold mb-2">Guarantor Details</h2>

          <div>
            <label className="block text-sm font-medium">Guarantor Name</label>
            <Input type="text" {...form.register("guarantorName")} placeholder="Enter guarantor's name" />
          </div>

          <div>
            <label className="block text-sm font-medium">Guarantor Mobile</label>
            <Input type="text" {...form.register("guarantorMobile")} placeholder="Enter guarantor's mobile number" />
          </div>

          <div>
            <label className="block text-sm font-medium">Guarantor Address</label>
            <Textarea {...form.register("guarantorAddress")} placeholder="Enter guarantor's address" />
          </div>

          <div>
            <label className="block text-sm font-medium">Relation with Customer</label>
            <Input type="text" {...form.register("guarantorRelation")} placeholder="e.g. Brother, Friend" />
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Register Customer"}
        </Button>
      </form>
    </div>
  );
}
