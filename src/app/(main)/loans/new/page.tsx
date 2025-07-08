"use client";

import React, { useState, useEffect } from 'react';
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from 'next/navigation';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const loanFormSchema = z.object({
  customer: z.string().min(1, { message: "Please select a customer." }),
  loanType: z.string().min(1, { message: "Please select a loan type." }),
  loanAmount: z.coerce.number().positive({ message: "Loan amount must be a positive number." }),
  tenure: z.coerce.number().int().positive({ message: "Tenure must be a positive number of months." }),
  interestRate: z.coerce.number().positive({ message: "Interest rate must be a positive number." }),
  processingFee: z.coerce.number().optional(),
  guarantorName: z.string().optional(),
  guarantorMobile: z.string().optional(),
  guarantorAddress: z.string().optional(),
});


export default function NewLoanPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  
  const [calculatedEmi, setCalculatedEmi] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);

  useEffect(() => {
    try {
      const storedCustomers = localStorage.getItem('customers');
      if (storedCustomers) {
        setCustomers(JSON.parse(storedCustomers));
      }
    } catch (error) {
      console.error("Failed to load customers from localStorage:", error);
    }
  }, []);

  const form = useForm<z.infer<typeof loanFormSchema>>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      customer: "",
      loanType: "",
      loanAmount: 0,
      tenure: 12,
      interestRate: 18,
      processingFee: 0,
      guarantorName: "",
      guarantorMobile: "",
      guarantorAddress: "",
    },
  });

  const watchedFields = useWatch({
    control: form.control,
    name: ["loanAmount", "interestRate", "tenure"],
  });

  useEffect(() => {
    const [loanAmount, interestRate, tenure] = watchedFields;
    if (loanAmount > 0 && interestRate > 0 && tenure > 0) {
      const principal = loanAmount;
      const rate = interestRate / 12 / 100;
      const n = tenure;

      const emi = (principal * rate * Math.pow(1 + rate, n)) / (Math.pow(1 + rate, n) - 1);
      const processingFee = principal * 0.05;

      if (isFinite(emi)) {
        form.setValue("processingFee", parseFloat(processingFee.toFixed(2)));
        setCalculatedEmi(parseFloat(emi.toFixed(2)));
        setTotalPayable(parseFloat((emi * n + processingFee).toFixed(2)));
      }
    } else {
        form.setValue("processingFee", 0);
        setCalculatedEmi(0);
        setTotalPayable(0);
    }
  }, [watchedFields, form]);
  
  function onSubmit(values: z.infer<typeof loanFormSchema>) {
    try {
      const storedLoanApps = localStorage.getItem('loanApplications');
      const loanApps = storedLoanApps ? JSON.parse(storedLoanApps) : [];

      const nextIdNumber = (loanApps.length > 0 ? Math.max(...loanApps.map((l: any) => parseInt(l.id.replace('LA', '')))) : 0) + 1;
      const newLoanId = `LA${String(nextIdNumber).padStart(3, '0')}`;
      
      const customer = customers.find(c => c.id === values.customer);
      const customerName = customer ? customer.name : "Unknown";

      const newLoanApplication = {
        id: newLoanId,
        customerId: values.customer,
        customerName: customerName,
        loanType: values.loanType,
        amount: values.loanAmount,
        tenure: values.tenure,
        interestRate: values.interestRate,
        processingFee: form.getValues("processingFee"),
        emi: calculatedEmi,
        date: new Date().toISOString().split('T')[0],
        status: 'Pending',
        guarantorName: values.guarantorName || '',
        guarantorMobile: values.guarantorMobile || '',
        guarantorAddress: values.guarantorAddress || '',
      };

      const updatedLoanApps = [...loanApps, newLoanApplication];
      localStorage.setItem('loanApplications', JSON.stringify(updatedLoanApps));
      
      toast({
        title: "Loan Application Submitted!",
        description: `Application for ${customerName} has been submitted for approval.`,
      });
      form.reset();
      router.push("/admin/approvals");

    } catch (error) {
        console.error("Failed to submit loan application:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: "Could not save the new loan application. Please try again.",
        });
    }
  }
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(value);
  };


  return (
    <div className="flex justify-center items-start py-8">
      <Card className="w-full max-w-4xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">New Loan Application</CardTitle>
          <CardDescription>Fill in the details to apply for a new loan.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div>
                <h3 className="text-lg font-medium mb-4">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField
                    control={form.control}
                    name="customer"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a customer" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loanType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                           <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select loan type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">Personal Loan</SelectItem>
                            <SelectItem value="business">Business Loan</SelectItem>
                            <SelectItem value="vehicle">Vehicle Loan</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="loanAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Amount (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 50000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tenure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tenure (in months)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g., 12" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="interestRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Interest Rate (%)</FormLabel>
                        <FormControl>
                           <Input type="number" step="0.01" placeholder="e.g., 18" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="processingFee"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Processing Fee (5%)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Auto-calculated" {...field} readOnly />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <Card className="bg-primary/5 border-dashed">
                <CardContent className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Monthly EMI</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(calculatedEmi)}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Total Payable Amount</p>
                        <p className="text-2xl font-bold">{formatCurrency(totalPayable)}</p>
                    </div>
                </CardContent>
              </Card>

              <Separator />

              <div>
                <h3 className="text-lg font-medium mb-4">Co-borrower / Guarantor Details (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="guarantorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter guarantor's name" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="guarantorMobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                           <Input type="tel" placeholder="Enter guarantor's mobile" {...field} />
                        </FormControl>
                         <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="md:col-span-2">
                    <FormField
                      control={form.control}
                      name="guarantorAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Enter guarantor's full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">Submit Application</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
