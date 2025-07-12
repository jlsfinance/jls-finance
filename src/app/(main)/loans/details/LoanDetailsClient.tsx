"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Loader2, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";

interface RepaymentItem {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paymentDate?: string;
  paymentMethod?: string;
}

interface Loan {
  id: string;
  amount: number;
  tenure: number;
  interestRate: number;
  emi: number;
  disbursalDate: string;
  status: string;
  customerName: string;
  repaymentSchedule: RepaymentItem[];
}

export default function LoanDetailsPage() {
  const router = useRouter();
  const { loanId } = useParams();
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editTenure, setEditTenure] = useState(0);
  const [editInterestRate, setEditInterestRate] = useState(0);
  const [editDisbursalDate, setEditDisbursalDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Load loan data
  useEffect(() => {
    if (!loanId) return;
    (async () => {
      setLoading(true);
      try {
        const ref = doc(db, "loans", loanId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const ld = { id: snap.id, ...snap.data() } as Loan;
          setLoan(ld);
          setEditAmount(ld.amount);
          setEditTenure(ld.tenure);
          setEditInterestRate(ld.interestRate);
          setEditDisbursalDate(ld.disbursalDate || format(new Date(), 'yyyy-MM-dd'));
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Loan not found!" });
        }
      } catch (err) {
        console.error(err);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load loan." });
      } finally {
        setLoading(false);
      }
    })();
  }, [loanId, toast]);

  const handleUpdateLoan = async () => {
    if (!loan) return;
    try {
      const monthlyRate = editInterestRate / 12 / 100;
      const emiCalc = Math.round(
        (editAmount * monthlyRate * Math.pow(1 + monthlyRate, editTenure)) /
        (Math.pow(1 + monthlyRate, editTenure) - 1)
      );
      const schedule = [];
      let bal = editAmount;
      const first = startOfMonth(addMonths(parseISO(editDisbursalDate), 1));
      for (let i = 0; i < editTenure; i++) {
        const interest = bal * monthlyRate;
        const principal = emiCalc - interest;
        bal -= principal;
        schedule.push({
          emiNumber: i + 1,
          dueDate: format(addMonths(first, i), 'yyyy-MM-dd'),
          amount: emiCalc,
          status: 'Pending'
        });
      }
      const updated = {
        amount: editAmount,
        tenure: editTenure,
        interestRate: editInterestRate,
        emi: emiCalc,
        disbursalDate: editDisbursalDate,
        repaymentSchedule: schedule
      };
      await updateDoc(doc(db, "loans", loan.id), updated);
      setLoan(prev => prev ? { ...prev, ...updated } : prev);
      toast({ title: "Loan Updated", description: "Loan details updated successfully." });
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update loan." });
    }
  };

  if (loading) return <Loader2 className="mx-auto animate-spin h-8 w-8" />;
  if (!loan) return (
    <div>Loan not found. <Button onClick={() => router.back()}>Back</Button></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.back()} variant="outline"><ArrowLeft /> Back</Button>
        <Button onClick={() => setEditOpen(true)}>✏️ Edit Loan</Button>
      </div>

      {/* ✅ Loan Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle>Loan Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p><strong>Customer Name:</strong> {loan.customerName}</p>
          <p><strong>Amount:</strong> ₹{loan.amount}</p>
          <p><strong>Tenure:</strong> {loan.tenure} months</p>
          <p><strong>Interest Rate:</strong> {loan.interestRate}%</p>
          <p><strong>EMI:</strong> ₹{loan.emi}</p>
          <p><strong>Disbursal Date:</strong> {loan.disbursalDate}</p>
          <p><strong>Status:</strong> {loan.status}</p>
        </CardContent>
      </Card>

      {/* ✅ Repayment Schedule Card */}
      <Card>
        <CardHeader>
          <CardTitle>Repayment Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMI #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loan.repaymentSchedule?.map((emi, i) => (
                <TableRow key={i}>
                  <TableCell>{emi.emiNumber}</TableCell>
                  <TableCell>{emi.dueDate}</TableCell>
                  <TableCell>₹{emi.amount}</TableCell>
                  <TableCell>{emi.status}</TableCell>
                  <TableCell>{emi.paymentDate || '-'}</TableCell>
                  <TableCell>{emi.paymentMethod || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ✏️ Edit Loan Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount</Label>
              <Input value={editAmount} type="number" onChange={e => setEditAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Tenure (months)</Label>
              <Input value={editTenure} type="number" onChange={e => setEditTenure(Number(e.target.value))} />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input value={editInterestRate} type="number" onChange={e => setEditInterestRate(Number(e.target.value))} />
            </div>
            <div>
              <Label>Disbursal Date</Label>
              <Input placeholder="yyyy-mm-dd" value={editDisbursalDate} onChange={e => setEditDisbursalDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateLoan}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
