
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarIcon, Loader2 } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import React from "react"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth } from "@/context/AuthContext"

const formSchema = z.object({
  // Personal Info
  fullName: z.string().min(2, { message: "Full name must be at least 2 characters." }),
  dob: z.date({ required_error: "Date of birth is required." }),
  gender: z.string({ required_error: "Please select a gender." }),
  maritalStatus: z.string({ required_error: "Please select a marital status." }),
  fatherName: z.string().min(2, { message: "Father's/Spouse's name is required." }),
  
  // Contact Info
  address: z.string().min(10, { message: "Address must be at least 10 characters." }),
  city: z.string().min(2, { message: "City is required." }),
  state: z.string().min(2, { message: "State is required." }),
  pincode: z.string().length(6, { message: "Pincode must be 6 digits." }),
  mobile: z.string().length(10, { message: "A valid 10-digit mobile number is required." }),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  
  // KYC Docs
  photo: z.instanceof(FileList).refine(files => files?.length >= 1, "Photo is required."),
  aadhaar: z.any().optional(),
  pan: z.any().optional(),
});

export default function NewCustomerPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    const [photoPreview, setPhotoPreview] = React.useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName: "",
            fatherName: "",
            address: "",
            city: "",
            state: "",
            pincode: "",
            mobile: "",
            email: "",
        },
    });

    const fileRef = form.register("photo");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) {
        toast({ variant: "destructive", title: "Not Authenticated", description: "You must be logged in to create a customer." });
        return;
    }
    setIsSubmitting(true);
    try {
      let photoPath = '';
      const photoFile = values.photo?.[0];

      if (photoFile) {
        // Use a unique file path including user id and timestamp
        const filePath = `${user.uid}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('customer-photos').upload(filePath, photoFile);
        if (uploadError) throw uploadError;
        photoPath = filePath;
      }
      
      const { data, error } = await supabase.from('customers').insert([
        { 
          name: values.fullName,
          dob: format(values.dob, "yyyy-MM-dd"),
          gender: values.gender,
          marital_status: values.maritalStatus,
          father_name: values.fatherName,
          address: values.address,
          city: values.city,
          state: values.state,
          pincode: values.pincode,
          phone: values.mobile,
          email: values.email || undefined,
          photo: photoPath,
          status: 'Active',
          created_by: user.uid,
          // Storing Aadhaar and PAN numbers will happen in a separate step or table in a real app
          // For now we assume they are uploaded, but we are not storing the document paths yet.
        }
      ]).select().single();

      if (error) throw error;
      
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
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Tabs defaultValue="personal" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="personal">Personal & Contact Info</TabsTrigger>
                        <TabsTrigger value="documents">KYC Documents & Photo</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="personal" className="mt-6">
                        <div className="space-y-8">
                            {/* Personal Details */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-medium text-primary">Personal Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="fullName" render={({ field }) => (
                                        <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="fatherName" render={({ field }) => (
                                        <FormItem><FormLabel>Father's / Spouse's Name</FormLabel><FormControl><Input placeholder="Richard Roe" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="dob" render={({ field }) => (
                                        <FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel>
                                            <Popover><PopoverTrigger asChild>
                                                <FormControl><Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button></FormControl>
                                            </PopoverTrigger><PopoverContent className="w-auto p-0" align="start">
                                                <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                                            </PopoverContent></Popover><FormMessage />
                                        </FormItem>
                                    )} />
                                     <FormField control={form.control} name="gender" render={({ field }) => (
                                         <FormItem><FormLabel>Gender</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent>
                                            </Select><FormMessage />
                                         </FormItem>
                                     )} />
                                    <FormField control={form.control} name="maritalStatus" render={({ field }) => (
                                         <FormItem><FormLabel>Marital Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                                                <SelectContent><SelectItem value="single">Single</SelectItem><SelectItem value="married">Married</SelectItem><SelectItem value="divorced">Divorced</SelectItem><SelectItem value="widowed">Widowed</SelectItem></SelectContent>
                                            </Select><FormMessage />
                                         </FormItem>
                                     )} />
                                </div>
                            </div>
                            {/* Contact Details */}
                             <div className="space-y-4">
                                <h3 className="text-lg font-medium text-primary">Contact Details</h3>
                                <FormField control={form.control} name="address" render={({ field }) => (
                                    <FormItem><FormLabel>Full Address</FormLabel><FormControl><Input placeholder="123, Main Street" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="city" render={({ field }) => (
                                        <FormItem><FormLabel>City</FormLabel><FormControl><Input placeholder="New Delhi" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="state" render={({ field }) => (
                                        <FormItem><FormLabel>State</FormLabel><FormControl><Input placeholder="Delhi" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="pincode" render={({ field }) => (
                                        <FormItem><FormLabel>Pincode</FormLabel><FormControl><Input placeholder="110001" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="mobile" render={({ field }) => (
                                        <FormItem><FormLabel>Mobile Number</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem><FormLabel>Email (Optional)</FormLabel><FormControl><Input placeholder="john.doe@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="documents" className="mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                          <div className="space-y-6">
                              <FormField
                                  control={form.control}
                                  name="aadhaar"
                                  render={({ field: { onChange, value, ...rest } }) => (
                                      <FormItem>
                                      <FormLabel>Aadhaar Card</FormLabel>
                                      <FormControl>
                                          <Input
                                          type="file"
                                          onChange={(e) =>
                                              onChange(e.target.files ? e.target.files[0] : undefined)
                                          }
                                          {...rest}
                                          />
                                      </FormControl>
                                      <FormDescription>
                                          Upload front and back as a single PDF.
                                      </FormDescription>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                              <FormField
                                  control={form.control}
                                  name="pan"
                                  render={({ field: { onChange, value, ...rest } }) => (
                                      <FormItem>
                                      <FormLabel>PAN Card</FormLabel>
                                      <FormControl>
                                          <Input
                                          type="file"
                                          onChange={(e) =>
                                              onChange(e.target.files ? e.target.files[0] : undefined)
                                          }
                                          {...rest}
                                          />
                                      </FormControl>
                                      <FormMessage />
                                      </FormItem>
                                  )}
                              />
                          </div>
                          <div className="space-y-4">
                            <FormField
                              control={form.control}
                              name="photo"
                              render={({ field }) => (
                                  <FormItem>
                                      <FormLabel>Upload Customer Photo</FormLabel>
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
                    </TabsContent>
                    </Tabs>

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
