"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import axios from "axios";

// 👇 Optional: move to .env.local
const IMGBB_API_KEY = process.env.NEXT_PUBLIC_IMGBB_API_KEY || "c9f4edabbd1fe1bc3a063e26bc6a2ecd";

const customerFormSchema = z.object({
  fullName: z.string().min(2, { message: "Full name is required." }),
  mobile: z.string().length(10, { message: "Enter 10-digit mobile number." }),
  address: z.string().min(10, { message: "Full address is required." }),
  aadhaar: z.string().length(12, "Aadhaar must be 12 digits.").optional().or(z.literal("")),
  pan: z.string().length(10, "PAN must be 10 characters.").optional().or(z.literal("")),
  voterId: z.string().min(5, "Voter ID too short.").optional().or(z.literal("")),
  guarantor: z
    .object({
      name: z.string().optional(),
      relation: z.string().optional(),
      mobile: z.string().length(10, "Must be 10-digit mobile").optional().or(z.literal("")),
      address: z.string().optional(),
    })
    .optional(),
  photo: z.instanceof(FileList).refine((file) => file.length > 0, "Photo is required."),
});

type CustomerFormValues = z.infer<typeof customerFormSchema>;

export default function AddCustomerPage() {
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

  async function onSubmit(values: CustomerFormValues) {
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
      const photoFile = values.photo?.[0];
      if (photoFile.size > 16 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: "Image Too Large",
          description: "Max size is 16MB.",
        });
        return;
      }

      // ✅ Upload to imgbb with error handling
      try {
        const formData = new FormData();
        formData.append("image", photoFile);

        const res = await axios.post(
          `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
          formData
        );

        if (res.status === 200 && res.data?.data?.url) {
          photoUrl = res.data.data.url;
        } else {
          console.error("imgbb upload response issue:", res.data);
          throw new Error("Image upload failed. Please try again.");
        }
      } catch (uploadErr: any) {
        console.error("imgbb upload error:", uploadErr);
        throw new Error("Failed to upload photo. Check API key or internet.");
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
      console.error("Submit error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error?.response?.data?.error?.message || error.message || "Something went wrong.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">New Customer Registration</h1>
      <Card>
        <CardHeader>
          <CardTitle>Customer Form</CardTitle>
          <CardDescription>Fill customer details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Input {...field} /></FormControl>
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
                    <FormControl><Textarea {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="font-medium text-primary">KYC Info</h3>

              <div className="grid md:grid-cols-3 gap-4">
                {["aadhaar", "pan", "voterId"].map((key) => (
                  <FormField
                    key={key}
                    control={form.control}
                    name={key as keyof CustomerFormValues}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{key.toUpperCase()}</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>

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
                        {key === "address" ? <Textarea {...field} /> : <Input {...field} />}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              <Separator />
              <h3 className="font-medium text-primary">Photo Upload</h3>

              <FormField
                control={form.control}
                name="photo"
                render={({ field: { onChange, ...rest } }) => (
                  <FormItem>
                    <FormLabel>Upload Photo *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const files = e.target.files;
                          form.setValue("photo", files, { shouldValidate: true });
                          const file = files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setPhotoPreview(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          } else {
                            setPhotoPreview(null);
                          }
                        }}
                      />
                    </FormControl>
                    <FormDescription>Max 16MB. Passport-size photo.</FormDescription>
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
