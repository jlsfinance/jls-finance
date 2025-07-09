
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { db, storage } from "@/lib/firebase"
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { useToast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Loader2 } from "lucide-react"

const customerSchema = z.object({
  name: z.string().min(2, "Full name is required."),
  mobile: z.string().length(10, "A valid 10-digit mobile number is required."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  address: z.string().optional(),
  aadhaar: z.string().length(12, "Aadhaar must be 12 digits.").optional().or(z.literal('')),
  pan: z.string().length(10, "PAN must be 10 characters.").optional().or(z.literal('')),
  voter_id: z.string().optional(),
  photo: z.instanceof(FileList).refine(files => files?.length >= 1, "Photo is required."),
  guarantor: z.object({
    name: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    relation: z.string().optional(),
  }).optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

export default function NewCustomerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      address: "",
      aadhaar: "",
      pan: "",
      voter_id: "",
      guarantor: {
        name: "",
        mobile: "",
        address: "",
        relation: "",
      }
    },
  });

  const onSubmit = async (data: CustomerFormValues) => {
    setIsSubmitting(true);
    
    try {
      // 1. Duplicate Check
      if (data.mobile) {
        const phoneQuery = query(collection(db, "customers"), where("mobile", "==", data.mobile));
        const phoneSnapshot = await getDocs(phoneQuery);
        if (!phoneSnapshot.empty) {
          form.setError("mobile", { type: "manual", message: "This mobile number is already registered." });
          setIsSubmitting(false);
          return;
        }
      }
      if (data.aadhaar) {
          const aadhaarQuery = query(collection(db, "customers"), where("aadhaar", "==", data.aadhaar));
          const aadhaarSnapshot = await getDocs(aadhaarQuery);
          if (!aadhaarSnapshot.empty) {
              form.setError("aadhaar", { type: "manual", message: "This Aadhaar number is already registered." });
              setIsSubmitting(false);
              return;
          }
      }

      // 2. Add customer document to get an ID
      const customerData = {
        name: data.name,
        mobile: data.mobile,
        email: data.email,
        address: data.address,
        aadhaar: data.aadhaar,
        pan: data.pan,
        voter_id: data.voter_id,
        guarantor: data.guarantor,
        status: "Active",
        createdAt: new Date().toISOString(),
        photo_url: ""
      };
      
      const docRef = await addDoc(collection(db, "customers"), customerData);

      // 3. Upload photo and update document
      const photoFile = data.photo?.[0];
      if (photoFile) {
        const storageRef = ref(storage, `customers/${docRef.id}/profile.jpg`);
        await uploadBytes(storageRef, photoFile);
        const photoUrl = await getDownloadURL(storageRef);
        
        await updateDoc(doc(db, "customers", docRef.id), {
          photo_url: photoUrl
        });
      }

      toast({
        title: "✅ Customer Registered",
        description: `${data.name} has been successfully added.`,
      });
      router.push("/customers");

    } catch (error) {
      console.error("Error saving customer:", error);
      toast({
        variant: "destructive",
        title: "❌ Registration Failed",
        description: "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
       <h1 className="text-2xl font-headline font-semibold">New Customer Registration</h1>
        <Card className="max-w-3xl mx-auto shadow-lg">
             <CardHeader>
                <CardTitle>Customer Details</CardTitle>
                <CardDescription>Fill out the form to register a new customer in Firestore.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        
                        <div className="space-y-4">
                             <h3 className="text-lg font-medium text-primary">Personal Information</h3>
                             <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem><FormLabel>Full Name *</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                             <div className="grid md:grid-cols-2 gap-4">
                                 <FormField control={form.control} name="mobile" render={({ field }) => (
                                    <FormItem><FormLabel>Mobile Number *</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                                 )} />
                                 <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email Address</FormLabel><FormControl><Input placeholder="john.d@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                 )} />
                             </div>
                              <FormField control={form.control} name="address" render={({ field }) => (
                                <FormItem><FormLabel>Full Address</FormLabel><FormControl><Textarea placeholder="123, Main Street, New Delhi" {...field} /></FormControl><FormMessage /></FormItem>
                             )} />
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-primary">KYC Details & Photo</h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="aadhaar" render={({ field }) => (
                                <FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="12-digit number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="pan" render={({ field }) => (
                                <FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input placeholder="10-character alphanumeric" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="voter_id" render={({ field }) => (
                                <FormItem><FormLabel>Voter ID</FormLabel><FormControl><Input placeholder="Voter card number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="photo" render={({ field: { onChange, value, ...rest } }) => (
                                    <FormItem><FormLabel>Profile Photo *</FormLabel><FormControl><Input type="file" accept="image/*" onChange={(e) => onChange(e.target.files)} {...rest} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-primary">Guarantor Information</h3>
                            <FormField control={form.control} name="guarantor.name" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor Name</FormLabel><FormControl><Input placeholder="Jane Smith" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <div className="grid md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="guarantor.mobile" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor Mobile</FormLabel><FormControl><Input placeholder="9876543211" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="guarantor.relation" render={({ field }) => (
                                <FormItem><FormLabel>Relation to Customer</FormLabel><FormControl><Input placeholder="Spouse, Father, etc." {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="guarantor.address" render={({ field }) => (
                                <FormItem><FormLabel>Guarantor Address</FormLabel><FormControl><Textarea placeholder="Guarantor's full address" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</> : "Save Customer"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
