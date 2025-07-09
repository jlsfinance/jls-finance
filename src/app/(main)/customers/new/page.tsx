
"use client";

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { db, storage } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { ref, uploadBytes } from "firebase/storage"
import { useAuth } from "@/context/AuthContext"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"

const customerFormSchema = z.object({
  // Personal Info
  fullName: z.string().min(2, { message: "Full name is required." }),
  mobile: z.string().length(10, { message: "A valid 10-digit mobile number is required." }),
  address: z.string().min(10, { message: "Full address is required." }),

  // KYC Details
  aadhaar: z.string().length(12, "Aadhaar must be 12 digits.").optional().or(z.literal('')),
  pan: z.string().length(10, "PAN must be 10 characters.").optional().or(z.literal('')),
  voterId: z.string().min(5, "Voter ID seems too short.").optional().or(z.literal('')),

  // Guarantor
  guarantor: z.object({
    name: z.string().optional(),
    relation: z.string().optional(),
    mobile: z.string().length(10, "Must be a 10-digit mobile number.").optional().or(z.literal('')),
    address: z.string().optional(),
  }).optional(),

  // Photo
  photo: z.instanceof(FileList).refine(files => files?.length >= 1, "Photo is required."),
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
            fullName: "jitu maheshwari",
            mobile: "9461612455",
            address: "kjadbkdbk",
            aadhaar: "941382100745",
            pan: "abcde1234r",
            voterId: "nzjxznxnn",
            guarantor: {
                name: "snlkscnlsac",
                relation: "xaxaxax",
                mobile: "9541234567",
                address: "a;mxcmlskclsmc",
            }
        },
    });
    
    const fileRef = form.register("photo");

  async function onSubmit(values: CustomerFormValues) {
    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to create a customer." });
        return;
    }
    setIsSubmitting(true);
    try {
      let photoPath = '';
      const photoFile = values.photo?.[0];

      if (photoFile) {
        const filePath = `customer-photos/${user.uid}/${Date.now()}_${photoFile.name}`;
        const storageRef = ref(storage, filePath);
        await uploadBytes(storageRef, photoFile);
        photoPath = filePath;
      }

      await addDoc(collection(db, 'customers'), {
          name: values.fullName,
          phone: values.mobile,
          address: values.address,
          aadhaar: values.aadhaar || null,
          pan: values.pan || null,
          voterId: values.voterId || null,
          guarantor: values.guarantor ? {
              name: values.guarantor.name || null,
              relation: values.guarantor.relation || null,
              mobile: values.guarantor.mobile || null,
              address: values.guarantor.address || null,
          } : null,
          photo: photoPath,
          status: 'Active',
          createdBy: user.uid,
          createdAt: new Date().toISOString(),
      });

      toast({
        title: "✅ Customer Registered",
        description: `${values.fullName} has been successfully added.`,
      });
      router.push("/customers");

    } catch(error: any) {
        console.error("Failed to register customer:", error);
        toast({
            variant: "destructive",
            title: "Registration Failed",
            description: error.message || "Could not save the new customer. Please try again.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-headline font-semibold">New Customer Registration</h1>
        <Card className="max-w-4xl mx-auto shadow-lg">
             <CardHeader>
                <CardTitle>Customer Registration Form</CardTitle>
                <CardDescription>Fill out the form below to add a new customer to the system.</CardDescription>
            </CardHeader>
            <CardContent>
             <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    {/* Personal & Contact Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-primary">Personal & Contact Details</h3>
                        <FormField control={form.control} name="fullName" render={({ field }) => (
                            <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="mobile" render={({ field }) => (
                            <FormItem><FormLabel>Mobile Number *</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Full Address *</FormLabel><FormControl><Textarea placeholder="123, Main Street, New Delhi" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>
                    
                    <Separator />

                    {/* KYC Section */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-primary">KYC Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="aadhaar" render={({ field }) => (
                                <FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="12-digit number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="pan" render={({ field }) => (
                                <FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input placeholder="10-character alphanumeric" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="voterId" render={({ field }) => (
                                <FormItem><FormLabel>Voter ID</FormLabel><FormControl><Input placeholder="Voter card number" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                    </div>
                    
                    <Separator />
                    
                    {/* Guarantor Details */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-primary">Guarantor Details</h3>
                        <FormField control={form.control} name="guarantor.name" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor Name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="guarantor.relation" render={({ field }) => (
                                <FormItem><FormLabel>Relation to Customer</FormLabel><FormControl><Input placeholder="Spouse, Father, etc." {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="guarantor.mobile" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor Mobile</FormLabel><FormControl><Input placeholder="9876543211" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <FormField control={form.control} name="guarantor.address" render={({ field }) => (
                            <FormItem><FormLabel>Guarantor Address</FormLabel><FormControl><Textarea placeholder="Guarantor's full address" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </div>

                    <Separator />

                    {/* Photo Upload */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-medium text-primary">Customer Photo</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                             <FormField
                              control={form.control}
                              name="photo"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Upload Photo *</FormLabel>
                                      <FormControl>
                                          <Input
                                              type="file"
                                              accept="image/png, image/jpeg, image/jpg"
                                              {...fileRef}
                                              onChange={(event) => {
                                                  field.onChange(event.target.files);
                                                  const file = event.target.files?.[0];
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
                                      <FormDescription>Must be a clear, passport-sized photo. Max 2MB.</FormDescription>
                                      <FormMessage />
                                  </FormItem>
                              )}
                            />
                            {photoPreview && (
                              <div className="flex justify-center items-center p-4 border rounded-md bg-muted/50">
                                  <Image
                                      src={photoPreview}
                                      alt="Customer Photo Preview"
                                      width={150}
                                      height={150}
                                      className="rounded-lg object-cover aspect-square"
                                  />
                              </div>
                            )}
                        </div>
                    </div>


                    <div className="mt-8 flex justify-end">
                        <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Customer
                        </Button>
                    </div>
                </form>
            </Form>
            </CardContent>
        </Card>
    </div>
  );
}

    