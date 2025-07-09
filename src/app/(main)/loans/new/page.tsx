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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const loanSchema = z.object({
  customerId: z.string().min(1, "Select a customer."),
  amount: z.coerce.number().min(1000, "Minimum ₹1000"),
  interestRate: z.coerce.number().min(0).max(50),
  tenure: z.coerce.number().min(1),
  processingFeePercentage: z.coerce.number().min(0).max(10),
  notes: z.string().optional(),
});

type LoanFormValues = z.infer<typeof loanSchema>;

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

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoanFormValues>({
    resolver: zodResolver(loanSchema),
    defaultValues: {
      customerId: "",
      amount: 100000,
      interestRate: 12,
      tenure: 12,
      processingFeePercentage: 2,
      notes: "",
    },
  });

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const snap = await getDocs(collection(db, "customers"));
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
        setCustomers(data);
      } catch {
        toast({ variant: "destructive", title: "Failed to load customers." });
      }
    };
    fetchCustomers();
  }, [toast]);

  useEffect(() => {
    const selected = customers.find(c => c.id === form.watch("customerId"));
    setSelectedCustomer(selected || null);
  }, [form.watch("customerId"), customers]);

  const onSubmit = async (data: LoanFormValues) => {
    if (!user || !selectedCustomer) return;

    setIsSubmitting(true);
    try {
      const processingFee = Math.round((data.amount * data.processingFeePercentage) / 100);
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
        notes: data.notes || null,
        status: "Pending",
        createdBy: user.uid,
        date: new Date().toISOString().split("T")[0],
      });

      toast({
        title: "Loan Submitted",
        description: "Application is awaiting approval.",
      });
      router.push("/admin/approvals");
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: e.message || "Could not submit loan.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const Info = ({ label, value }: { label: string; value?: string }) =>
    value ? <p className="text-sm"><strong>{label}:</strong> {value}</p> : null;

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Loan Application Form</h1>
      <Card>
        <CardHeader>
          <CardTitle>New Loan</CardTitle>
          <CardDescription>Select a customer and fill in the loan details.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

              {/* Customer Selection */}
              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Select Customer</FormLabel>
                    <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between"
                          >
                            {field.value
                              ? customers.find(c => c.id === field.value)?.name
                              : "Select a customer"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search customer..." />
                          <CommandList>
                            <CommandEmpty>No customer found.</CommandEmpty>
                            <CommandGroup>
                              {customers.map(c => (
                                <CommandItem
                                  key={c.id}
                                  value={c.id}
                                  onSelect={(value) => {
                                    field.onChange(value);
                                    setComboboxOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", c.id === field.value ? "opacity-100" : "opacity-0")} />
                                  {c.name}
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
                  <div className="flex items-start gap-4">
                    <Image
                      src={selectedCustomer.photo_url || "https://placehold.co/100x100"}
                      alt={selectedCustomer.name}
                      width={100}
                      height={100}
                      className="rounded-md border object-cover aspect-square"
                    />
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
              )}

              {/* Loan Fields */}
              {selectedCustomer && (
                <>
                  <Separator />
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="amount" render={({ field }) => (
                      <FormItem><FormLabel>Loan Amount (₹)</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="tenure" render={({ field }) => (
                      <FormItem><FormLabel>Tenure (Months)</FormLabel><FormControl><Input {...field} type="number" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="interestRate" render={({ field }) => (
                      <FormItem><FormLabel>Interest Rate (%)</FormLabel><FormControl><Input {...field} type="number" step="0.1" /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="processingFeePercentage" render={({ field }) => (
                      <FormItem><FormLabel>Processing Fee (%)</FormLabel><FormControl><Input {...field} type="number" step="0.1" /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                    ) : "Submit Application for Approval"}
                  </Button>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
