"use client"
import React, { useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addMonths, subMonths, startOfMonth, parse, isValid } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Receipt, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Schema for the collection form
const collectionSchema = z.object({
    loanId: z.string(),
    emiNumber: z.number(),
    amount: z.coerce.number().positive("Amount must be positive."),
    paymentDate: z.date({ required_error: "Payment date is required." }),
    paymentMethod: z.enum(["cash", "upi", "bank"], { required_error: "Select a payment method." }),
});

// Interface for the due EMI list items
interface DueEmi {
    customerId: string;
    customerName: string;
    customerPhoto: string;
    loanId: string;
    emiNumber: number;
    totalEmis: number;
    emiAmount: number;
    dueDate: string;
}

export default function NewCollectionPage() {
    const [dueEmis, setDueEmis] = useState<DueEmi[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmi, setSelectedEmi] = useState<DueEmi | null>(null);
    const [reportMonth, setReportMonth] = useState<Date>(startOfMonth(new Date()));
    const { toast } = useToast();

    const form = useForm<z.infer<typeof collectionSchema>>({
        resolver: zodResolver(collectionSchema),
        defaultValues: {
            paymentMethod: "cash",
        }
    });

    // Fetch due EMIs when the month changes
    useEffect(() => {
        setLoading(true);
        setSelectedEmi(null);
        form.reset();
        try {
            const storedLoans = localStorage.getItem('loanApplications');
            const storedCustomers = localStorage.getItem('customers');

            if (!storedLoans || !storedCustomers) {
                setLoading(false);
                return;
            }

            const allLoans = JSON.parse(storedLoans);
            const allCustomers = JSON.parse(storedCustomers);

            const disbursedLoans = allLoans.filter((l: any) => l.status === 'Disbursed' && l.repaymentSchedule);
            
            const dueItems: DueEmi[] = [];
            const firstDayOfMonthStr = format(reportMonth, 'yyyy-MM-dd');

            disbursedLoans.forEach((loan: any) => {
                const dueEmi = loan.repaymentSchedule.find((emi: any) => emi.dueDate === firstDayOfMonthStr && emi.status === 'Pending');
                if (dueEmi) {
                    const customer = allCustomers.find((c: any) => c.id === loan.customerId);
                    if (customer) {
                        dueItems.push({
                            customerId: customer.id,
                            customerName: customer.name,
                            customerPhoto: customer.photo,
                            loanId: loan.id,
                            emiNumber: dueEmi.emiNumber,
                            totalEmis: loan.tenure,
                            emiAmount: dueEmi.amount,
                            dueDate: dueEmi.dueDate,
                        });
                    }
                }
            });
            
            dueItems.sort((a, b) => a.customerName.localeCompare(b.customerName));
            setDueEmis(dueItems);
        } catch (error) {
            console.error("Failed to load due EMIs:", error);
            toast({ variant: "destructive", title: "Load Failed", description: "Could not load due EMI list." });
        } finally {
            setLoading(false);
        }
    }, [reportMonth, toast, form]);

    // Handle clicking on a customer from the list
    const handleSelectEmi = (emi: DueEmi) => {
        setSelectedEmi(emi);
        form.reset({
            loanId: emi.loanId,
            emiNumber: emi.emiNumber,
            amount: emi.emiAmount,
            paymentDate: new Date(),
            paymentMethod: "cash",
        });
    };

    // Handle form submission
    const onSubmit = (values: z.infer<typeof collectionSchema>) => {
        try {
            const storedLoans = localStorage.getItem('loanApplications');
            if (!storedLoans) throw new Error("Loan data not found.");

            let allLoans = JSON.parse(storedLoans);
            const loanIndex = allLoans.findIndex((l: any) => l.id === values.loanId);

            if (loanIndex === -1) throw new Error("Loan not found.");

            const loan = allLoans[loanIndex];
            const emiIndex = loan.repaymentSchedule.findIndex((e: any) => e.emiNumber === values.emiNumber);
            
            if (emiIndex === -1) throw new Error("EMI schedule not found.");

            // Update EMI status and add payment details
            loan.repaymentSchedule[emiIndex].status = 'Paid';
            loan.repaymentSchedule[emiIndex].paymentDate = format(values.paymentDate, 'yyyy-MM-dd');
            loan.repaymentSchedule[emiIndex].paymentMethod = values.paymentMethod;
            loan.repaymentSchedule[emiIndex].amountPaid = values.amount;

            allLoans[loanIndex] = loan;
            localStorage.setItem('loanApplications', JSON.stringify(allLoans));

            // Update UI
            setDueEmis(prev => prev.filter(e => !(e.loanId === values.loanId && e.emiNumber === values.emiNumber)));
            setSelectedEmi(null);
            form.reset();

            toast({
                title: "Payment Recorded!",
                description: `EMI payment for ${selectedEmi?.customerName} recorded successfully.`
            });

        } catch (error: any) {
            console.error("Failed to record payment:", error);
            toast({ variant: "destructive", title: "Submission Failed", description: error.message || "Could not record payment." });
        }
    };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      <Card className="lg:col-span-1 shadow-lg">
        <CardHeader>
          <CardTitle>Due EMIs</CardTitle>
          <div className="flex items-center justify-between">
            <CardDescription>{format(reportMonth, 'MMMM yyyy')}</CardDescription>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setReportMonth(subMonths(reportMonth, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="outline" size="icon" onClick={() => setReportMonth(addMonths(reportMonth, 1))}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh]">
                <div className="space-y-4">
                {loading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : dueEmis.length > 0 ? (
                    dueEmis.map(emi => (
                        <div key={`${emi.loanId}-${emi.emiNumber}`}
                             onClick={() => handleSelectEmi(emi)}
                             className={cn("p-3 rounded-lg flex items-center gap-4 cursor-pointer border transition-colors",
                                selectedEmi?.loanId === emi.loanId && selectedEmi?.emiNumber === emi.emiNumber ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                             )}
                        >
                            <Avatar>
                                <AvatarImage src={emi.customerPhoto} alt={emi.customerName} data-ai-hint="person portrait" />
                                <AvatarFallback>{emi.customerName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                                <p className="font-semibold">{emi.customerName}</p>
                                <p className="text-sm text-muted-foreground">
                                    EMI: ₹{emi.emiAmount.toLocaleString('en-IN')}
                                </p>
                            </div>
                            <Badge variant="secondary">EMI {emi.emiNumber}/{emi.totalEmis}</Badge>
                        </div>
                    ))
                ) : (
                    <div className="text-center text-muted-foreground p-8">No pending EMIs for this month.</div>
                )}
                </div>
            </ScrollArea>
        </CardContent>
      </Card>
      
      <Card className="lg:col-span-2 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">New EMI Collection</CardTitle>
          <CardDescription>
            {selectedEmi ? `Recording payment for ${selectedEmi.customerName}` : 'Select a customer from the list to start.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {!selectedEmi ? (
                    <div className="h-96 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                        <p>Select a due EMI from the left panel to record a payment.</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Amount Received (₹)</FormLabel>
                                        <FormControl><Input type="number" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                    );
                                }}
                            />
                        </div>
                        
                        <FormField
                            control={form.control}
                            name="paymentMethod"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Payment Method</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col md:flex-row gap-4"
                                    >
                                    <FormItem className="flex items-center space-x-2">
                                        <FormControl><RadioGroupItem value="cash" id="cash" /></FormControl>
                                        <Label htmlFor="cash">Cash</Label>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2">
                                        <FormControl><RadioGroupItem value="upi" id="upi" /></FormControl>
                                        <Label htmlFor="upi">UPI</Label>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-2">
                                        <FormControl><RadioGroupItem value="bank" id="bank" /></FormControl>
                                        <Label htmlFor="bank">Bank Transfer</Label>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="flex justify-end pt-4">
                        <Button type="submit" disabled={!selectedEmi || form.formState.isSubmitting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Receipt className="mr-2 h-4 w-4" />}
                            Record Payment
                        </Button>
                        </div>
                    </>
                )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
