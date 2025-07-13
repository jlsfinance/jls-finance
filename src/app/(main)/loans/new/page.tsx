"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserCheck } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";

const loanSchema = z.object({
  customerId: z.string().min(1, "Select a customer."),
  amount: z.coerce.number().min(1000, "Minimum ₹1000"),
  interestRate: z.coerce.number().min(0).max(50),
  tenure: z.coerce.number().min(1),
  processingFeePercentage: z.coerce.number().min(0).max(10),
  notes: z.string().optional(),
});
type LoanFormValues = z.infer<typeof loanSchema>;

const DEFAULT_LOAN_VALUES: LoanFormValues = {
  customerId: "",
  amount: 50000,
  interestRate: 38.5,
  tenure: 24,
  processingFeePercentage: 5,
  notes: "",
};

interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  aadhaar?: string;
  pan?: string;
  voterId?: string;
  photo_url?: string;
  guarantor?: {
    name?: string;
    mobile?: string;
    address?: string;
    relation?: string;
  };
}

const Info: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? <p className="text-sm"><strong>{label}:</strong> {value}</p> : null;

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerLoans, setCustomerLoans] = useState<Record<string, boolean>>({});
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: DEFAULT_LOAN_VALUES,
    mode: "onBlur",
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const custSnap = await getDocs(collection(db, "customers"));
        const allCustomers: Customer[] = custSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(allCustomers);

        const loansSnap = await getDocs(collection(db, "loans"));
        const loanedCustomerIds = new Set<string>();
        loansSnap.forEach(doc => {
          const data = doc.data();
          if (data.customerId) loanedCustomerIds.add(data.customerId);
        });

        const loanMap: Record<string, boolean> = {};
        allCustomers.forEach(c => {
          loanMap[c.id] = loanedCustomerIds.has(c.id);
        });
        setCustomerLoans(loanMap);
      } catch (err) {
        toast({ variant: "destructive", title: "Failed to load customers or loans." });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [toast]);

  const amount = form.watch("amount");
  const processingFeePercentage = form.watch("processingFeePercentage");
  const processingFee = useMemo(() => Math.round((amount * processingFeePercentage) / 100) || 0, [amount, processingFeePercentage]);

  const onSubmit = async (data: LoanFormValues) => {
    if (!user || !selectedCustomer) return;
    setIsSubmitting(true);
    try {
      const sanitizedNotes = data.notes ? DOMPurify.sanitize(data.notes) : null;
      const monthlyRate = data.interestRate / 12 / 100;
      const emi = Math.round(
        (data.amount * monthlyRate * Math.pow(1 + monthlyRate, data.tenure)) /
        (Math.pow(1 + monthlyRate, data.tenure) - 1)
      );
      await addDoc(collection(db, "loans"), {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        amount: data.amount,
        interestRate: data.interestRate,
        tenure: data.tenure,
        processingFeePercentage: data.processingFeePercentage,
        processingFee,
        emi,
        notes: sanitizedNotes,
        status: "Pending",
        createdBy: user.uid,
        date: new Date().toISOString().split("T")[0],
      });
      toast({ title: "Loan Submitted", description: "Application is awaiting approval." });
      router.push("/admin/approvals");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message || "Could not submit loan." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Loan Application Form</h1>
      {!selectedCustomer && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Select a Customer</h2>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="animate-spin h-8 w-8" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
              {customers.map(customer => {
                const hasLoan = customerLoans[customer.id];
                return (
                  <Card key={customer.id} className={`flex flex-col items-center p-4 gap-2 transition ${hasLoan ? "opacity-50 bg-gray-100 pointer-events-none" : "hover:shadow-lg"}`}>
                    <Image src={customer.photo_url || "https://placehold.co/80x80"} alt={customer.name} width={80} height={80} className="rounded-full object-cover" loading="lazy" />
                    <div className="text-center font-medium">{customer.name}</div>
                    {!hasLoan && (
                      <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-semibold mb-2">Apply for him now:</div>
                    )}
                    {!hasLoan && (
                      <Button className="w-full" onClick={() => {
                        form.setValue("customerId", customer.id);
                        setSelectedCustomer(customer);
                      }}>Apply</Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {selectedCustomer && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>New Loan for {selectedCustomer.name}</CardTitle>
            <CardDescription>Fill in the loan details.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="bg-muted/50 p-4">
                  <div className="flex items-start gap-4">
                    <Image src={selectedCustomer.photo_url || "https://placehold.co/100x100"} alt={selectedCustomer.name} width={100} height={100} className="rounded-md border object-cover aspect-square" loading="lazy" />
                    <div className="space-y-1">
                      <h3 className="text-xl font-semibold flex items-center gap-2">
                        <UserCheck /> {selectedCustomer.name}
                      </h3>
                      <Info label="Mobile" value={selectedCustomer.phone} />
                      <Info label="Address" value={selectedCustomer.address} />
                    </div>
                  </div>
                  <Separator className="my-3" />
                  <div className="grid md:grid-cols-3 gap-2 text-sm">
                    <Info label="Aadhaar" value={selectedCustomer.aadhaar} />
                    <Info label="PAN" value={selectedCustomer.pan} />
                    <Info label="Voter ID" value={selectedCustomer.voterId} />
                  </div>
                </Card>
                <Separator />
                <div className="grid md:grid-cols-2 gap-4">
                  {['amount', 'tenure', 'interestRate', 'processingFeePercentage'].map((fieldName, index) => (
                    <FormField
                      key={fieldName}
                      control={form.control}
                      name={fieldName as keyof LoanFormValues}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel htmlFor={field.name}>{fieldName === 'amount' ? 'Loan Amount (₹)' : fieldName === 'tenure' ? 'Tenure (Months)' : fieldName === 'interestRate' ? 'Interest Rate (%)' : 'Processing Fee (%)'}</FormLabel>
                          <FormControl>
                            <Input {...field} id={field.name} name={field.name} type="number" step={fieldName.includes('Rate') || fieldName.includes('Fee') ? 0.1 : 1} onBlur={field.onBlur} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  Processing Fee: <span className="font-semibold">₹{processingFee}</span>
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel htmlFor="notes">Notes</FormLabel>
                      <FormControl>
                        <Textarea {...field} id="notes" name="notes" onBlur={field.onBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>) : "Submit Application for Approval"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => {
                    setSelectedCustomer(null);
                    form.reset(DEFAULT_LOAN_VALUES);
                  }}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
