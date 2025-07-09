
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";

const loanApplicationSchema = z.object({
  // Customer fields
  name: z.string().min(2, "Full name is required."),
  mobile: z.string().length(10, "A valid 10-digit mobile number is required."),
  email: z.string().email("Please enter a valid email.").optional().or(z.literal('')),
  address: z.string().optional(),
  aadhaar: z.string().length(12, "Aadhaar must be 12 digits.").optional().or(z.literal('')),
  pan: z.string().length(10, "PAN must be 10 characters.").optional().or(z.literal('')),
  voter_id: z.string().optional(),
  
  guarantor: z.object({
    name: z.string().optional(),
    mobile: z.string().optional(),
    address: z.string().optional(),
    relation: z.string().optional(),
  }).optional(),

  // Loan fields
  amount: z.coerce.number().positive("Loan amount must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative"),
  tenure: z.coerce.number().int().positive("Tenure must be a positive number of months"),
  processingFeePercentage: z.coerce.number().min(0).max(100),
});

type LoanApplicationFormValues = z.infer<typeof loanApplicationSchema>;

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanApplicationFormValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      name: "",
      mobile: "",
      email: "",
      address: "",
      aadhaar: "",
      pan: "",
      voter_id: "",
      guarantor: { name: "", mobile: "", address: "", relation: "" },
      amount: 10000,
      interestRate: 12,
      tenure: 12,
      processingFeePercentage: 2,
    },
  });

  const onSubmit = async (data: LoanApplicationFormValues) => {
    if (!user) {
        toast({ variant: "destructive", title: "Authentication Error", description: "You must be logged in." });
        return;
    }
    setIsSubmitting(true);
    try {
      // 1. Create Customer in Firestore
      const customerDocRef = await addDoc(collection(db, "customers"),{
        name: data.name,
        phone: data.mobile,
        email: data.email,
        address: data.address,
        aadhaar: data.aadhaar,
        pan: data.pan,
        voterId: data.voter_id,
        guarantor: data.guarantor,
        status: "Active",
        createdBy: user.uid,
        createdAt: new Date().toISOString()
      });
      
      const newCustomerId = customerDocRef.id;
      
      // 2. Create Loan in Firestore
      const processingFee = (data.amount * data.processingFeePercentage) / 100;
      const monthlyInterestRate = data.interestRate / 12 / 100;
      const emi = (data.amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, data.tenure)) / (Math.pow(1 + monthlyInterestRate, data.tenure) - 1);
      
      await addDoc(collection(db, "loans"),{
        customerId: newCustomerId,
        customerName: data.name,
        amount: data.amount,
        interestRate: data.interestRate,
        tenure: data.tenure,
        processingFeePercentage: data.processingFeePercentage,
        processingFee: Math.round(processingFee),
        emi: Math.round(emi),
        status: "Pending",
        date: new Date().toISOString().split('T')[0], // Application date
      });

      toast({
        title: "✅ Application Submitted",
        description: `Loan application for ${data.name} created successfully.`,
      });
      router.push("/admin/approvals");

    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({
        variant: "destructive",
        title: "❌ Submission Failed",
        description: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-headline font-semibold">New Customer Loan Application</h1>
        <Card className="max-w-3xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle>Application Form</CardTitle>
                <CardDescription>Register a new customer and their loan application at the same time.</CardDescription>
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
                            <h3 className="text-lg font-medium text-primary">KYC Details</h3>
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

                        <Separator />

                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-primary">Loan Details</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="amount" render={({ field }) => (
                                    <FormItem><FormLabel>Loan Amount (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="tenure" render={({ field }) => (
                                    <FormItem><FormLabel>Tenure (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField control={form.control} name="interestRate" render={({ field }) => (
                                    <FormItem><FormLabel>Interest Rate (% p.a.)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="processingFeePercentage" render={({ field }) => (
                                    <FormItem><FormLabel>Processing Fee (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>
                        
                        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait...</> : "Submit Application"}
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  );
}
