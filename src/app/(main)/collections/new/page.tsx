// New EMI Collection Page (Firestore-integrated)
"use client";

import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const schema = z.object({
  loanId: z.string().min(1),
  amountPaid: z.coerce.number().positive(),
  paymentDate: z.date(),
  paymentMethod: z.enum(["cash", "upi", "bank"]),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewEMICollectionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loan, setLoan] = useState<any>(null);
  const [loadingLoan, setLoadingLoan] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      loanId: "",
      paymentMethod: "cash",
      paymentDate: new Date(),
    },
  });

  const loanId = form.watch("loanId");

  const nextEMI = useMemo(() => {
    return loan?.repaymentSchedule?.find((emi: any) => emi.status === "Pending");
  }, [loan]);

  useEffect(() => {
    if (nextEMI) form.setValue("amountPaid", nextEMI.amount);
  }, [nextEMI, form]);

  const fetchLoan = async () => {
    setLoadingLoan(true);
    try {
      const docRef = doc(db, "loans", loanId);
      const snap = await getDoc(docRef);
      if (snap.exists()) setLoan(snap.data());
      else
        toast({
          variant: "destructive",
          title: "Loan Not Found",
          description: "No loan with this ID found in database.",
        });
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: "Loan fetch failed." });
    } finally {
      setLoadingLoan(false);
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!loan || !nextEMI) return toast({ title: "No due EMI found." });
    try {
      const loanRef = doc(db, "loans", loanId);
      const updatedSchedule = loan.repaymentSchedule.map((emi: any) => {
        if (emi.emiNumber === nextEMI.emiNumber) {
          return {
            ...emi,
            status: "Paid",
            amountPaid: values.amountPaid,
            paymentDate: format(values.paymentDate, "yyyy-MM-dd"),
            paymentMethod: values.paymentMethod,
            remarks: values.remarks || "",
          };
        }
        return emi;
      });
      await updateDoc(loanRef, { repaymentSchedule: updatedSchedule });

      await addDoc(collection(db, "receipts"), {
        loanId,
        emiNumber: nextEMI.emiNumber,
        customerName: loan.customerName,
        customerId: loan.customerId,
        amountPaid: values.amountPaid,
        paymentDate: format(values.paymentDate, "yyyy-MM-dd"),
        paymentMethod: values.paymentMethod,
        remarks: values.remarks || "",
        createdAt: serverTimestamp(),
      });

      toast({ title: "Payment Saved" });
      router.push(`/loans/details?id=${loanId}`);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Failed", description: err.message });
    }
  };

  return (
    <div className="flex justify-center py-8">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>New EMI Collection</CardTitle>
          <CardDescription>Record payment for next due EMI</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="loanId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Loan ID</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input {...field} onBlur={fetchLoan} />
                        {loadingLoan && <Loader2 className="animate-spin" />}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {loan && nextEMI && (
                <div className="bg-muted/50 rounded-md p-4">
                  <p className="text-sm font-bold">Customer: {loan.customerName}</p>
                  <p>EMI #{nextEMI.emiNumber} due on {nextEMI.dueDate}</p>
                  <p>Amount: ₹{nextEMI.amount.toLocaleString()}</p>
                </div>
              )}

              <FormField
                control={form.control}
                name="amountPaid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount Paid</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className={cn("w-full", !field.value && "text-muted-foreground")}> 
                            {field.value ? format(field.value, "PPP") : "Pick a date"}
                            <CalendarIcon className="ml-2 h-4 w-4" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="p-0">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <RadioGroup defaultValue={field.value} onValueChange={field.onChange} className="flex gap-4">
                      <FormItem className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></FormItem>
                      <FormItem className="flex items-center space-x-2"><RadioGroupItem value="upi" id="upi" /><Label htmlFor="upi">UPI</Label></FormItem>
                      <FormItem className="flex items-center space-x-2"><RadioGroupItem value="bank" id="bank" /><Label htmlFor="bank">Bank</Label></FormItem>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Remarks (Optional)</FormLabel>
                    <FormControl><Input placeholder="Any remarks?" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full">Record Payment</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
