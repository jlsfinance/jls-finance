
"use client";

import { useState, useEffect } from "react";
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
import { Loader2, UserCheck, ChevronsUpDown, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { addDoc, collection, getDocs } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import Image from "next/image";

import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const loanApplicationSchema = z.object({
  customerId: z.string().min(1, "Please select a customer."),
  amount: z.coerce.number().positive("Loan amount must be positive").min(1000, "Amount must be at least ₹1,000"),
  interestRate: z.coerce.number().min(0, "Interest rate cannot be negative").max(50, "Interest rate seems too high"),
  tenure: z.coerce.number().int().positive("Tenure must be a positive number of months").min(1, "Tenure must be at least 1 month"),
  processingFeePercentage: z.coerce.number().min(0, "Processing fee cannot be negative").max(10, "Processing fee seems too high"),
  notes: z.string().optional(),
});

type LoanApplicationFormValues = z.infer<typeof loanApplicationSchema>;

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

export default function NewLoanPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false)

  const form = useForm<LoanApplicationFormValues>({
    resolver: zodResolver(loanApplicationSchema),
    defaultValues: {
      customerId: "",
      amount: 100000,
      interestRate: 12,
      tenure: 24,
      processingFeePercentage: 2,
      notes: "",
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "customers"));
        const customersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(customersData);
      } catch (error) {
        toast({ variant: 'destructive', title: 'Failed to load customers' });
      }
    };
    fetchCustomers();
  }, [toast]);
  
  useEffect(() => {
    const customerId = form.watch("customerId");
    const customer = customers.find((c) => c.id === customerId);
    setSelectedCustomer(customer || null);
  }, [form, customers, form.watch("customerId")]);


  const onSubmit = async (data: LoanApplicationFormValues) => {
    if (!user || !selectedCustomer) {
      toast({ variant: "destructive", title: "Error", description: "User or customer not selected." });
      return;
    }
    setIsSubmitting(true);
    try {
      const processingFee = (data.amount * data.processingFeePercentage) / 100;
      const monthlyInterestRate = data.interestRate / 12 / 100;
      const emi = (data.amount * monthlyInterestRate * Math.pow(1 + monthlyInterestRate, data.tenure)) / (Math.pow(1 + monthlyInterestRate, data.tenure) - 1);

      await addDoc(collection(db, "loans"), {
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        amount: data.amount,
        interestRate: data.interestRate,
        tenure: data.tenure,
        processingFeePercentage: data.processingFeePercentage,
        processingFee: Math.round(processingFee),
        emi: Math.round(emi),
        status: "Pending", // Set to Pending for the approval queue
        notes: data.notes || null,
        createdBy: user.uid,
        date: new Date().toISOString().split('T')[0], // Application date
      });

      toast({
        title: "✅ Application Submitted",
        description: `Loan application for ${selectedCustomer.name} submitted and awaiting approval.`,
      });
      router.push("/admin/approvals");

    } catch (error: any) {
      console.error("Error submitting application:", error);
      toast({ variant: "destructive", title: "❌ Submission Failed", description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const InfoField = ({ label, value }: { label: string; value?: string | null }) => (
    value ? <div className="text-sm"><span className="font-semibold text-muted-foreground">{label}:</span> {value}</div> : null
  );
  
  const placeholderImage = 'https://placehold.co/100x100.png';

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-headline font-semibold">New Loan for Existing Customer</h1>
      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle>Loan Application Form</CardTitle>
          <CardDescription>Select a customer and fill out the loan details below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary">Customer Selection</h3>
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Search and Select Customer *</FormLabel>
                      <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={comboboxOpen}
                              className={cn(
                                "w-full justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? customers.find(
                                    (customer) => customer.id === field.value
                                  )?.name
                                : "Select customer..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search customer by name..." />
                            <CommandList>
                                <CommandEmpty>No customer found.</CommandEmpty>
                                <CommandGroup>
                                {customers.map((customer) => (
                                    <CommandItem
                                      value={customer.id}
                                      key={customer.id}
                                      onSelect={(currentValue) => {
                                        form.setValue("customerId", currentValue === field.value ? "" : currentValue)
                                        setComboboxOpen(false)
                                      }}
                                    >
                                    <Check
                                        className={cn(
                                        "mr-2 h-4 w-4",
                                        customer.id === field.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {customer.name}
                                    </CommandItem>
                                ))}
                                </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedCustomer && (
                    <Card className="bg-muted/50 p-4">
                        <CardHeader className="p-2 flex flex-row items-start gap-4">
                             <Image 
                                src={selectedCustomer.photo_url || placeholderImage}
                                alt={selectedCustomer.name}
                                width={100}
                                height={100}
                                className="rounded-md object-cover aspect-square border"
                                data-ai-hint="person"
                             />
                             <div className="space-y-1">
                                <CardTitle className="text-xl flex items-center gap-2"><UserCheck/> {selectedCustomer.name}</CardTitle>
                                <InfoField label="Mobile" value={selectedCustomer.phone} />
                                <InfoField label="Address" value={selectedCustomer.address} />
                             </div>
                        </CardHeader>
                        <CardContent className="p-2 space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm mb-2">KYC Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-2">
                                   <InfoField label="Aadhaar" value={selectedCustomer.aadhaar} />
                                   <InfoField label="PAN" value={selectedCustomer.pan} />
                                   <InfoField label="Voter ID" value={selectedCustomer.voterId} />
                                </div>
                            </div>
                            {selectedCustomer.guarantor?.name && (
                                <>
                                <Separator />
                                <div className="space-y-2">
                                     <h4 className="font-semibold text-sm">Guarantor Details</h4>
                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2">
                                         <InfoField label="Name" value={selectedCustomer.guarantor.name} />
                                         <InfoField label="Relation" value={selectedCustomer.guarantor.relation} />
                                         <InfoField label="Mobile" value={selectedCustomer.guarantor.mobile} />
                                         <InfoField label="Address" value={selectedCustomer.guarantor.address} />
                                     </div>
                                </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                )}
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-primary">Loan Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="amount" render={({ field }) => (
                    <FormItem><FormLabel>Loan Amount (₹) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="tenure" render={({ field }) => (
                    <FormItem><FormLabel>Tenure (Months) *</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="interestRate" render={({ field }) => (
                    <FormItem><FormLabel>Interest Rate (% p.a.) *</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="processingFeePercentage" render={({ field }) => (
                    <FormItem><FormLabel>Processing Fee (%) *</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Internal Notes / Remarks</FormLabel><FormControl><Textarea placeholder="Any internal notes about this loan application..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || !selectedCustomer}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : "Submit Application for Approval"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
