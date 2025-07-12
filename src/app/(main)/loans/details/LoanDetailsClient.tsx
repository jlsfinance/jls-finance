"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Printer, Loader2, Pencil } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO, addMonths, startOfMonth } from 'date-fns';

interface Emi {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: string;
  paymentDate?: string;
  paymentMethod?: string;
  amountPaid?: number;
}

interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  tenure: number;
  interestRate: number;
  processingFee: number;
  emi: number;
  date: string;
  status: string;
  approvalDate?: string;
  disbursalDate: string;
  notes?: string;
  repaymentSchedule: Emi[];
}

const userRole = "admin"; // 🔐 You can replace this with your actual auth role check

export default function LoanDetailsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('id');
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  // Editable states
  const [editAmount, setEditAmount] = useState(0);
  const [editTenure, setEditTenure] = useState(0);
  const [editInterestRate, setEditInterestRate] = useState(0);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editDisbursalDate, setEditDisbursalDate] = useState('');
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    const loadLoan = async () => {
      if (!loanId) return;
      setLoading(true);
      try {
        const ref = doc(db, "loans", loanId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = { id: snap.id, ...snap.data() } as Loan;
          setLoan(data);

          // Fill edit fields
          setEditAmount(data.amount);
          setEditTenure(data.tenure);
          setEditInterestRate(data.interestRate);
          setEditCustomerName(data.customerName);
          setEditDisbursalDate(data.disbursalDate || '');
          setEditNotes(data.notes || '');
        } else {
          toast({ variant: "destructive", title: "Not Found", description: "Loan not found!" });
        }
      } catch (error) {
        console.error(error);
        toast({ variant: "destructive", title: "Error", description: "Could not load loan." });
      } finally {
        setLoading(false);
      }
    };
    loadLoan();
  }, [loanId]);

  const handleUpdate = async () => {
    if (!loan) return;

    try {
      const monthlyRate = editInterestRate / 12 / 100;
      const emi = Math.round(
        (editAmount * monthlyRate * Math.pow(1 + monthlyRate, editTenure)) /
        (Math.pow(1 + monthlyRate, editTenure) - 1)
      );

      const schedule = [];
      let bal = editAmount;
      const first = startOfMonth(addMonths(parseISO(editDisbursalDate), 1));
      for (let i = 0; i < editTenure; i++) {
        const interest = bal * monthlyRate;
        const principal = emi - interest;
        bal -= principal;
        schedule.push({
          emiNumber: i + 1,
          dueDate: format(addMonths(first, i), 'yyyy-MM-dd'),
          amount: emi,
          status: 'Pending'
        });
      }

      const updatedLoan = {
        amount: editAmount,
        tenure: editTenure,
        interestRate: editInterestRate,
        emi,
        disbursalDate: editDisbursalDate,
        repaymentSchedule: schedule,
        customerName: editCustomerName,
        notes: editNotes
      };

      await updateDoc(doc(db, "loans", loan.id), updatedLoan);
      setLoan(prev => prev ? { ...prev, ...updatedLoan } : prev);
      toast({ title: "Updated", description: "Loan details updated." });
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Update Failed", description: "Could not update loan." });
    }
  };

  if (loading) return <Loader2 className="animate-spin w-8 h-8 mx-auto mt-20" />;
  if (!loan) return <div className="text-center py-10">Loan not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        {["admin", "manager"].includes(userRole) && (
          <Button onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Loan
          </Button>
        )}
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
          <div><strong>Disbursed:</strong> {loan.disbursalDate}</div>
          <div><strong>Status:</strong> <Badge>{loan.status}</Badge></div>
          <div className="col-span-2"><strong>Notes:</strong> {loan.notes || '---'}</div>
        </CardContent>
      </Card>

      {/* 🔧 Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Customer Name</Label>
              <Input value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" value={editAmount} onChange={e => setEditAmount(Number(e.target.value))} />
            </div>
            <div>
              <Label>Tenure (months)</Label>
              <Input type="number" value={editTenure} onChange={e => setEditTenure(Number(e.target.value))} />
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input type="number" value={editInterestRate} onChange={e => setEditInterestRate(Number(e.target.value))} />
            </div>
            <div>
              <Label>Disbursal Date</Label>
              <Input type="date" value={editDisbursalDate} onChange={e => setEditDisbursalDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleUpdate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
