"use client";

// ✨ Copilot Prompt: Create a customer registration form in React using react-hook-form and zod.
// Upload image to imgbb and save details in Firebase Firestore.

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import axios from "axios";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import Image from "next/image";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { Separator } from "@/components/ui/separator";

// ✅ imgbb API key (hardcoded)
const IMGBB_API_KEY = "c9f4edabbd1fe1bc3a063e26bc6a2ecd";

// ✅ Schema
const customerFormSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  mobile: z.string().length(10, "Enter 10-digit mobile number."),
  address: z.string().min(10, "Full address is required."),
  aadhaar: z.string().length(12).optional().or(z.literal("")),
  pan: z.string().length(10).optional().or(z.literal("")),
  voterId: z.string().min(5).optional().or(z.literal("")),
  guarantor: z
    .object({
      name: z.string().optional(),
      relation: z.string().optional(),
      mobile: z.string().length(10).optional().or(z.literal("")),
      address: z.string().optional(),
    })
    .optional(),
  photo: z
    .instanceof(FileList)
    .refine((f) => f.length > 0, "Photo is required."),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      fullName: "",
      mobile: "",
      address: "",
      aadhaar: "",
      pan: "",
      voterId: "",
      guarantor: {
        name: "",
        relation: "",
        mobile: "",
        address: "",
      },
    },
  });

  const onSubmit = async (values: CustomerFormValues) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Not Authenticated",
        description: "Please login to continue.",
      });
      return;
    }

    setIsSubmitting(true);
    let photoUrl = "";

    try {
      const file = values.photo?.[0];
      if (file.size > 16 * 1024 * 1024) {
        throw new Error("Photo too large. Max 16MB.");
      }

      // ✅ Upload to imgbb
      const formData = new FormData();
      formData.append("image", file);

      const res = await axios.post(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      if (res.data?.data?.url) {
        photoUrl = res.data.data.url;
      } else {
        throw new Error("imgbb upload failed. Try again.");
      }

      // ✅ Save to Firestore
      await addDoc(collection(db, "customers"), {
        name: values.fullName,
        phone: values.mobile,
        address: values.address,
        aadhaar: values.aadhaar || null,
        pan: values.pan || null,
        voterId: values.voterId || null,
        guarantor:
          values.guarantor && (values.guarantor.name || values.guarantor.mobile)
            ? {
                name: values.guarantor.name || null,
                relation: values.guarantor.relation || null,
                mobile: values.guarantor.mobile || null,
                address: values.guarantor.address || null,
              }
            : null,
        photo_url: photoUrl,
        status: "Active",
        createdBy: user.uid,
        createdAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Customer Added",
        description: `${values.fullName} has been registered.`,
      });

      router.push("/customers");
    } catch (error: any) {
      console.error("Error submitting form:", error);
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description:
          error?.response?.data?.error?.message ||
          error.message ||
          "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New Customer Registration</h1>
      <Card>
        <CardHeader>
          <CardTitle>Customer Form</CardTitle>
          <CardDescription>Fill all required fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Info */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mobile"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Full address..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* KYC */}
              <Separator />
              <h3 className="font-medium text-primary">KYC Info</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {["aadhaar", "pan", "voterId"].map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as keyof CustomerFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{key.toUpperCase()}</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

              {/* Guarantor */}
              <Separator />
              <h3 className="font-medium text-primary">Guarantor</h3>
              {["name", "relation", "mobile", "address"].map((key) => (
                <FormField
                  key={key}
                  control={form.control}
                  name={`guarantor.${key}` as any}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{key.charAt(0).toUpperCase() + key.slice(1)}</FormLabel>
                      <FormControl>
                        {key === "address" ? (
                          <Textarea {...field} />
                        ) : (
                          <Input {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {/* Photo */}
              <Separator />
              <h3 className="font-medium text-primary">Photo Upload</h3>
              <FormField
                control={form.control}
                name="photo"
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Photo *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onChange(e.target.files);
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>Max 16MB.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {photoPreview && (
                <div className="w-32 h-32 rounded-md border mt-2 overflow-hidden">
                  <Image
                    src={photoPreview}
                    alt="Preview"
                    width={128}
                    height={128}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Saving...
                  </>
                ) : (
                  "Save Customer"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
