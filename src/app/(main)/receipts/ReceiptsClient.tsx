"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format, parse, isValid } from 'date-fns'
import { PlusCircle, Download, CalendarIcon, Loader2 } from 'lucide-react'
import jsPDF from 'jspdf'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// Schema for the manual receipt form
const receiptSchema = z.object({
  customerId: z.string({ required_error: "Please select a customer." }).min(1, "Please select a customer."),
  loanId: z.string({ required_error: "Please select a loan." }).min(1, "Please select a loan."),
  amount: z.coerce.number().positive("Amount must be a positive number."),
  emiNumber: z.coerce.number().int().positive("EMI number must be a positive integer."),
  paymentDate: z.date({ required_error: "Payment date is required." }),
  paymentMethod: z.enum(["cash", "upi", "bank"], { required_error: "Select a payment method." }),
  referenceNumber: z.string().optional(),
});

interface Receipt {
    id: string;
    loanId: string;
    customerName: string;
    amount: number;
    paymentDate: string;
    method: string;
}

export default function ReceiptsClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loans, setLoans] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);


  const form = useForm<z.infer<typeof receiptSchema>>({
    resolver: zodResolver(receiptSchema),
    defaultValues: {
        customerId: "",
        loanId: "",
        amount: 0,
        emiNumber: 1,
        paymentDate: new Date(),
        paymentMethod: "cash",
        referenceNumber: ""
    }
  });

  const selectedCustomerId = form.watch("customerId");

  const customerLoans = useMemo(() => {
    if (!selectedCustomerId) return [];
    return loans.filter(loan => loan.customerId === selectedCustomerId && loan.status === 'Disbursed');
  }, [selectedCustomerId, loans]);
  
  useEffect(() => {
    // Reset loanId when customer changes
    if (form.getValues("customerId")) {
      form.resetField("loanId");
    }
  }, [selectedCustomerId, form]);


  const loadData = useCallback(() => {
    try {
        // Load paid EMIs from loan applications
        const storedLoans = localStorage.getItem('loanApplications');
        const allLoans = storedLoans ? JSON.parse(storedLoans) : [];
        setLoans(allLoans);
        
        const paidEmis: Receipt[] = [];
        allLoans.forEach((loan: any) => {
            if (loan.repaymentSchedule) {
                loan.repaymentSchedule.forEach((emi: any) => {
                    if (emi.status === 'Paid') {
                        paidEmis.push({
                            id: `RCPT-${loan.id}-${emi.emiNumber}`,
                            loanId: loan.id,
                            customerName: loan.customerName,
                            amount: emi.amountPaid || emi.amount,
                            paymentDate: emi.paymentDate,
                            method: (emi.paymentMethod || 'N/A').toUpperCase()
                        });
                    }
                });
            }
        });

        // Load manual receipts
        const storedManualReceipts = localStorage.getItem('manualReceipts');
        const manualReceipts = storedManualReceipts ? JSON.parse(storedManualReceipts) : [];
        
        // Combine and sort receipts
        const allReceipts = [...paidEmis, ...manualReceipts].sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
        setReceipts(allReceipts);

        // Load customers for the form dropdown
        const storedCustomers = localStorage.getItem('customers');
        if (storedCustomers) {
            setCustomers(JSON.parse(storedCustomers));
        }

    } catch (error) {
        console.error("Failed to load receipts:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load receipts." });
    }
  }, [toast]);

  useEffect(() => {
    loadData();
    const action = searchParams.get('action');
    if (action === 'add') {
      setIsDialogOpen(true);
    }
  }, [loadData, searchParams]);

  function onSubmit(values: z.infer<typeof receiptSchema>) {
    try {
        const storedManualReceipts = localStorage.getItem('manualReceipts');
        const manualReceipts = storedManualReceipts ? JSON.parse(storedManualReceipts) : [];
        
        const customer = customers.find(c => c.id === values.customerId);
        if (!customer) throw new Error("Customer not found");

        const newReceipt: Receipt = {
            id: `MAN-RCPT-${Date.now()}`,
            loanId: values.loanId,
            customerName: customer.name,
            amount: values.amount,
            paymentDate: format(values.paymentDate, 'yyyy-MM-dd'),
            method: values.paymentMethod.toUpperCase(),
        };

        const updatedReceipts = [...manualReceipts, newReceipt];
        localStorage.setItem('manualReceipts', JSON.stringify(updatedReceipts));
        
        toast({
            title: "Receipt Added!",
            description: `Manual receipt for ${customer.name} has been added.`
        });

        form.reset();
        setIsDialogOpen(false);
        loadData(); // Reload data to show the new receipt

    } catch (error: any) {
        console.error("Failed to add receipt:", error);
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(value);
  };
  
  const handleDownloadReceipt = (receipt: Receipt) => {
    setIsDownloading(receipt.id);
    try {
        const doc = new jsPDF();
        let y = 15;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JLS FINANCE LTD", 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Payment Receipt", 105, y, { align: 'center' });
        y += 15;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Receipt ID: ${receipt.id}`, 14, y);
        y += 7;
        doc.text(`Payment Date: ${format(new Date(receipt.paymentDate), 'PPP') || 'N/A'}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y); // separator
        y += 10;

        doc.text(`Customer Name: ${receipt.customerName}`, 14, y);
        y += 7;
        doc.text(`Loan ID: ${receipt.loanId}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y); // separator
        y += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Description", 14, y);
        doc.text("Amount", 180, y, { align: 'right' });
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.text(`Payment Received`, 14, y);
        doc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 10;

        doc.line(14, y, 196, y);
        
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.text("Total Paid:", 130, y);
        doc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 13;

        doc.text(`Payment Method: ${receipt.method || 'N/A'}`, 14, y);

        doc.setFontSize(10);
        doc.text("This is a computer-generated receipt and does not require a signature.", 105, 280, { align: 'center' });
        
        doc.save(`Receipt_${receipt.id}.pdf`);
        toast({ title: "Receipt Downloaded!" });
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not generate the PDF receipt."
        });
    } finally {
        setIsDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Payment Receipts</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Receipt
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Add Manual Receipt</DialogTitle>
                    <DialogDescription>
                        Manually record a payment receipt. This will not affect the EMI schedule.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="customerId"
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
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="loanId"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Loan</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || ""} disabled={!selectedCustomerId}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a loan" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {customerLoans.map((l) => (
                                            <SelectItem key={l.id} value={l.id}>{l.id} - ₹{l.amount.toLocaleString('en-IN')}</SelectItem>
                                        ))}
                                    </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount Paid (₹)</FormLabel>
                                        <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="emiNumber"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>EMI Number</FormLabel>
                                        <FormControl><Input type="number" placeholder="e.g. 1" {...field} value={field.value ?? ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                         <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => {
                                const [dateString, setDateString] = React.useState<string>(
                                    field.value ? format(field.value, 'dd/MM/yyyy') : ''
                                );
                            
                                React.useEffect(() => {
                                    if (field.value) {
                                        const formattedDate = format(field.value, 'dd/MM/yyyy');
                                        if (formattedDate !== dateString) {
                                            setDateString(formattedDate);
                                        }
                                    } else {
                                        setDateString("");
                                    }
                                }, [field.value]);

                                const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                                    const value = e.target.value;
                                    setDateString(value);
                                    if (value.length >= 10) {
                                        const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
                                        if (isValid(parsedDate)) {
                                            field.onChange(parsedDate);
                                        } else {
                                            field.onChange(undefined);
                                        }
                                    }
                                };
                                return (
                                <FormItem>
                                    <FormLabel>Payment Date</FormLabel>
                                     <Popover>
                                        <div className="relative">
                                            <FormControl>
                                            <Input
                                                placeholder="DD/MM/YYYY"
                                                value={dateString}
                                                onChange={handleInputChange}
                                            />
                                            </FormControl>
                                            <PopoverTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                aria-label="Open calendar"
                                            >
                                                <CalendarIcon className="h-4 w-4" />
                                            </Button>
                                            </PopoverTrigger>
                                        </div>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => {
                                                    field.onChange(date);
                                                    if (date) {
                                                        setDateString(format(date, 'dd/MM/yyyy'));
                                                    }
                                                }}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                                )
                            }}
                        />
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Payment Method</FormLabel>
                                <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="cash" id="cash" /></FormControl><Label htmlFor="cash">Cash</Label></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="upi" id="upi" /></FormControl><Label htmlFor="upi">UPI</Label></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="bank" id="bank" /></FormControl><Label htmlFor="bank">Bank Transfer</Label></FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="referenceNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Reference Number (Optional)</FormLabel>
                                    <FormControl><Input placeholder="e.g. UPI transaction ID" {...field} value={field.value ?? ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Receipt
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Receipts</CardTitle>
          <CardDescription>View and download payment receipts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Loan ID</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipts.length > 0 ? receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.id}</TableCell>
                  <TableCell>{receipt.customerName}</TableCell>
                  <TableCell>{receipt.loanId}</TableCell>
                  <TableCell>₹{receipt.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{receipt.paymentDate}</TableCell>
                  <TableCell>{receipt.method}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(receipt)} disabled={isDownloading === receipt.id}>
                      {isDownloading === receipt.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No receipts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
