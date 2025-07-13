"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Emi {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending';
  paymentDate?: string;
}

interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  mobileNumber: string;
  amount: number;
  tenure: number;
  interestRate: number;
  emi: number;
  disbursalDate: string;
  repaymentSchedule: Emi[];
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

  useEffect(() => {
    console.log("loan Id : " + loanId);
    if (!loanId || typeof loanId !== 'string') return;
    (async () => {
      setLoading(true);
      try {
        console.log("loan Id 2 : " + loanId)
        const snap = await getDoc(doc(db, 'loans', loanId));
        if (snap.exists()) {
          const data = snap.data() as Loan;
          setLoan({ ...data, id: snap.id });
          setEditAmount(data.amount);
          setEditTenure(data.tenure);
          setEditInterestRate(data.interestRate);
          setEditDisbursalDate(data.disbursalDate);
        } else {
          toast({ variant: 'destructive', title: 'Not found', description: 'Loan not found' });
        }
      } catch (err) {
        console.error(err);
        toast({ variant: 'destructive', title: 'Error', description: 'Failed to load loan' });
      } finally {
        setLoading(false);
      }
    })();
  }, [loanId, toast]);

  const handleUpdateLoan = async () => {
    if (!loan) return;
    try {
      const monthlyRate = editInterestRate / 12 / 100;
      const emi = Math.round(
        (editAmount * monthlyRate * Math.pow(1 + monthlyRate, editTenure)) /
        (Math.pow(1 + monthlyRate, editTenure) - 1)
      );

      let balance = editAmount;
      const schedule: Emi[] = [];
      const first = startOfMonth(addMonths(parseISO(editDisbursalDate), 1));

      for (let i = 0; i < editTenure; i++) {
        const interest = balance * monthlyRate;
        const principal = emi - interest;
        balance -= principal;
        schedule.push({
          emiNumber: i + 1,
          dueDate: format(addMonths(first, i), 'yyyy-MM-dd'),
          amount: emi,
          status: 'Pending'
        });
      }

      const updated = {
        amount: editAmount,
        tenure: editTenure,
        interestRate: editInterestRate,
        emi,
        disbursalDate: editDisbursalDate,
        repaymentSchedule: schedule
      };

      await updateDoc(doc(db, 'loans', loan.id), updated);
      setLoan(prev => prev ? { ...prev, ...updated } : prev);
      toast({ title: 'Loan Updated', description: 'Changes saved.' });
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to update loan' });
    }
  };

  const handleDownloadPDF = () => {
    if (!loan) return;
    const docPDF = new jsPDF();
    const rows = loan.repaymentSchedule.map((emi, index) => [
      index + 1,
      loan.customerName,
      loan.mobileNumber || '—',
      `₹${emi.amount}`,
      emi.emiNumber
    ]);
    const total = loan.repaymentSchedule.reduce((sum, emi) => sum + emi.amount, 0);

    autoTable(docPDF, {
      head: [['Sr No.', 'Name', 'Mobile Number', 'EMI Amount', 'EMI Number']],
      body: rows
    });

    autoTable(docPDF, {
      body: [['', '', '', 'Total', `₹${total}`]],
      startY: docPDF.lastAutoTable.finalY! + 10,
      styles: { fontStyle: 'bold' },
    });

    docPDF.save(`emi-summary-${loan.id}.pdf`);
  };

  if (loading) return <Loader2 className="mx-auto animate-spin h-8 w-8" />;
  if (!loan) return <div className="p-10 text-center">Loan not found.<br /><Button onClick={() => router.back()} className="mt-4">Back</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={() => router.back()} variant="outline"><ArrowLeft /> Back</Button>
        <div className="flex gap-2">
          <Button onClick={() => setEditOpen(true)}>✏️ Edit Loan</Button>
          <Button onClick={handleDownloadPDF}><Download className="mr-1 h-4 w-4" /> Download PDF</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{loan.customerName}</CardTitle>
          <CardDescription>Loan ID: {loan.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><strong>Amount:</strong> ₹{loan.amount}</div>
          <div><strong>EMI:</strong> ₹{loan.emi}</div>
          <div><strong>Interest Rate:</strong> {loan.interestRate}%</div>
          <div><strong>Tenure:</strong> {loan.tenure} months</div>
          <div><strong>Disbursal Date:</strong> {loan.disbursalDate}</div>
          <div><strong>Status:</strong> <Badge>Active</Badge></div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Label>Amount</Label>
            <Input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} />
            <Label>Tenure</Label>
            <Input type="number" value={editTenure} onChange={e => setEditTenure(Number(e.target.value))} />
            <Label>Interest Rate</Label>
            <Input type="number" value={editInterestRate} onChange={e => setEditInterestRate(Number(e.target.value))} />
            <Label>Disbursal Date</Label>
            <Input type="date" value={editDisbursalDate} onChange={e => setEditDisbursalDate(e.target.value)} />
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdateLoan}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
