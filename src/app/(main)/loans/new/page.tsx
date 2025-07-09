"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loanSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  amount: z.coerce.number().positive("Loan amount must be positive"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative"),
  tenure: z.coerce.number().int().positive("Tenure must be a positive number of months"),
  processingFeePercentage: z.coerce.number().min(0).max(100),
});

type LoanFormValues = z.infer<typeof loanSchema>;

interface Customer {
  id: string;
  name: string;
}

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      customerId: "",
      amount: 10000,
      interestRate: 12,
      tenure: 12,
      processingFeePercentage: 2,
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        const customersData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name,
        })) as Customer[];
        setCustomers(customersData);
      } catch (error) {
        console.error("Error fetching customers: ", error);
        toast({
          variant: "destructive",
          title: "Failed to load customers",
          description: "Could not fetch customer list from Firestore.",
        });
      }
    };
    fetchCustomers();
  }, [toast]);

  const onSubmit = async (data: LoanFormValues) => {
    setIsSubmitting(true);
    try {
        const customer = customers.find(c => c.id === data.customerId);
        if (!customer) {
            throw new Error("Selected customer not found.");
        }

        const processingFee = (data.amount * data.processingFeePercentage) / 100;
        const monthlyInterestRate = data.interestRate / 12 / 100;
        const emi = (data.amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, data.tenure)) / (Math.pow(1 + monthlyInterestRate, data.tenure) - 1);

        await addDoc(collection(db, "loans"), {
            ...data,
            customerName: customer.name,
            processingFee: Math.round(processingFee),
            emi: Math.round(emi),
            date: new Date().toISOString().split('T')[0],
            status: "Pending", // Initial status
        });

        toast({
            title: "✅ Loan Application Submitted",
            description: `Application for ${customer.name} has been successfully created.`,
        });
        router.push("/admin/approvals");
    } catch (error) {
        console.error("Error saving loan application:", error);
        toast({
            variant: "destructive",
            title: "❌ Submission Failed",
            description: "Could not save the loan application.",
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-headline font-semibold">New Loan Application</h1>
        <Card className="max-w-2xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle>Loan Details</CardTitle>
                <CardDescription>Fill out the form to create a new loan application.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="customerId"
                            render={({ field }) => (
                                <FormItem>
                                <Label>Customer</Label>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a registered customer" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                    {customers.length > 0 ? (
                                        customers.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))
                                    ) : (
                                        <SelectItem value="loading" disabled>Loading customers...</SelectItem>
                                    )}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Loan Amount (₹)</Label>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="tenure"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Tenure (Months)</Label>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="interestRate"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Interest Rate (% p.a.)</Label>
                                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="processingFeePercentage"
                                render={({ field }) => (
                                <FormItem>
                                    <Label>Processing Fee (%)</Label>
                                    <FormControl><Input type="number" step="0.1" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                           {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Submit Application
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    </div>
  )
}
