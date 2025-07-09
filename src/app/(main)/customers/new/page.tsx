
"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { db } from "@/lib/firebase"
import { addDoc, collection } from "firebase/firestore"
import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Loader2 } from "lucide-react"

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const formSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "A valid 10-digit mobile number is required"),
  email: z.string().email("Please enter a valid email address.").optional().or(z.literal('')),
  address: z.string().optional(),
  
  photo: z.any()
    .refine((files) => files?.[0], "Customer photo is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 2MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, and .png formats are supported."
    ),

  aadhaar: z.string().optional(),
  voter_id: z.string().optional(),
  pan: z.string().optional(),

  guarantor_name: z.string().optional(),
  guarantor_mobile: z.string().optional(),
  guarantor_address: z.string().optional(),
  guarantor_relation: z.string().optional(),
})

export default function NewCustomerForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      address: "",
      aadhaar: "",
      voter_id: "",
      pan: "",
      guarantor_name: "",
      guarantor_mobile: "",
      guarantor_address: "",
      guarantor_relation: "",
    },
  })
  
  const fileRef = form.register('photo');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    
    try {
      const photoFile = values.photo[0];
      let photo_url = "";
      if (photoFile) {
        photo_url = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
            reader.readAsDataURL(photoFile);
        });
      }

      const customerData = {
        name: values.name,
        email: values.email || "",
        mobile: values.mobile,
        address: values.address || "",
        status: "Active",
        aadhaar: values.aadhaar || "",
        pan: values.pan || "",
        voter_id: values.voter_id || "",
        photo_url: photo_url,
        createdAt: new Date(),

        guarantor: {
          name: values.guarantor_name || "",
          mobile: values.guarantor_mobile || "",
          address: values.guarantor_address || "",
          relation: values.guarantor_relation || "",
        },
      };

      await addDoc(collection(db, "customers"), customerData);

      toast({
        title: "Customer Added!",
        description: `${values.name} has been successfully registered.`,
      })
      router.push("/customers")
    
    } catch (error: any) {
      console.error("Failed to add customer:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "An error occurred while saving the customer.",
      });
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Register New Customer</CardTitle>
          <CardDescription>Fill in the details below to add a new customer to Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Customer Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Full Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="mobile" render={({ field }) => (<FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="10-digit mobile" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input type="email" placeholder="Email Address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Address (Optional)</FormLabel><FormControl><Textarea placeholder="Full Address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="photo" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Customer Photo</FormLabel><FormControl><Input type="file" accept="image/*" {...fileRef} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
              </div>
              
              <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">KYC Details (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField control={form.control} name="aadhaar" render={({ field }) => (<FormItem><FormLabel>Aadhaar Number</FormLabel><FormControl><Input placeholder="Aadhaar Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="pan" render={({ field }) => (<FormItem><FormLabel>PAN Number</FormLabel><FormControl><Input placeholder="PAN Number" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="voter_id" render={({ field }) => (<FormItem><FormLabel>Voter ID</FormLabel><FormControl><Input placeholder="Voter ID" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
              </div>

               <div className="space-y-4">
                  <h3 className="font-semibold text-lg border-b pb-2">Guarantor Details (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name="guarantor_name" render={({ field }) => (<FormItem><FormLabel>Guarantor Name</FormLabel><FormControl><Input placeholder="Guarantor Name" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="guarantor_mobile" render={({ field }) => (<FormItem><FormLabel>Guarantor Mobile</FormLabel><FormControl><Input placeholder="Guarantor Mobile" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="guarantor_address" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Guarantor Address</FormLabel><FormControl><Textarea placeholder="Guarantor Address" {...field} /></FormControl><FormMessage /></FormItem>)} />
                      <FormField control={form.control} name="guarantor_relation" render={({ field }) => (<FormItem><FormLabel>Relation with Customer</FormLabel><FormControl><Input placeholder="e.g., Father, Friend" {...field} /></FormControl><FormMessage /></FormItem>)} />
                  </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Customer
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
