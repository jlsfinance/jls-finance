"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addMonths, startOfMonth, format, parse, isValid } from 'date-fns';
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// EMI & Loan interfaces (same as before)
interface Emi { emiNumber: number; dueDate: string; amount: number; status: 'Paid'|'Pending'; paymentDate?: string; paymentMethod?: string; amountPaid?: number; }
interface Loan { id: string; customerId: string; customerName: string; amount: number; tenure: number; interestRate: number; processingFee: number; emi: number; date: string; status: string; approvalDate?: string; disbursalDate?: string; repaymentSchedule: Emi[]; }

export default function LoanDetailsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const loanId = searchParams.get('id');
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan|null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  // Editable fields
  const [amount, setAmount] = useState(0);
  const [emi, setEmi] = useState(0);
  const [tenure, setTenure] = useState(0);
  const [disbursalDateString, setDisbursalDateString] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date|undefined>(undefined);

  // Load loan data from Firestore directly
  useEffect(() => {
    async function loadLoan() {
      if (!loanId) return setLoading(false);
      try {
        const docRef = doc(db, 'loans', loanId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const ld = snap.data() as Loan;
          setLoan(ld);
        } else toast({ variant: 'destructive', title: 'Not Found', description: 'Loan not found.' });
      } catch (err) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch loan.' });
      } finally { setLoading(false); }
    }
    loadLoan();
  }, [loanId]);

  // Prepare edit form defaults when entering edit mode
  useEffect(() => {
    if (editMode && loan) {
      setAmount(loan.amount);
      setEmi(loan.emi);
      setTenure(loan.tenure);
      if (loan.disbursalDate) {
        const d = parse(loan.disbursalDate, 'yyyy-MM-dd', new Date());
        setSelectedDate(d);
        setDisbursalDateString(format(d, 'dd/MM/yyyy'));
      } else setDisbursalDateString('');
    }
  }, [editMode, loan]);

  const handleSave = async () => {
    if (!loan || !selectedDate) return;
    if (!amount || !emi || !tenure) return toast({ variant: 'destructive', title: 'Validation', description: 'All fields are required.' });
    if (!isValid(selectedDate)) return toast({ variant: 'destructive', title: 'Date invalid', description: 'Please provide valid date.' });

    try {
      const docRef = doc(db, 'loans', loan.id);
      const firstDate = startOfMonth(addMonths(selectedDate, 1));
      const schedule = Array.from({ length: tenure }).map((_, i) => ({
        emiNumber: i + 1,
        dueDate: format(addMonths(firstDate, i), 'yyyy-MM-dd'),
        amount: emi,
        status: 'Pending'
      }));
      // update Firestore
      await updateDoc(docRef, {
        amount, emi, tenure,
        disbursalDate: format(selectedDate, 'yyyy-MM-dd'),
        repaymentSchedule: schedule
      });
      setLoan({ ...loan, amount, emi, tenure, disbursalDate: format(selectedDate,'yyyy-MM-dd'), repaymentSchedule: schedule });
      toast({ title: 'Loan Updated', description: 'Changes saved successfully.' });
      setEditMode(false);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Update failed', description: 'Could not save changes.' });
    }
  };

  // ... rest of your code: schedule memo, PDF, print UI etc.

  if (loading) return <div className="flex justify-center"><Loader2 className="animate-spin"/></div>;
  if (!loan) return (
    <Card><CardContent>
      <Button onClick={() => router.push('/loans')}><ArrowLeft/> Back</Button>
    </CardContent></Card>
  );

  return (
    <>
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}><ArrowLeft/> Back</Button>
        <h1>Loan Details</h1>
        <Dialog open={editMode} onOpenChange={setEditMode}>
          <DialogTrigger asChild><Button>✏️ Edit</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label>Amount</Label>
              <Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} />
              <Label>EMI</Label>
              <Input type="number" value={emi} onChange={e => setEmi(+e.target.value)} />
              <Label>Duration (Months)</Label>
              <Input type="number" value={tenure} onChange={e => setTenure(+e.target.value)} />
              <Label>Disbursal Date</Label>
              <Input value={disbursalDateString} onChange={e => setDisbursalDateString(e.target.value)} />
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={handleSave}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Loan Details Card */}
      <Card className="mt-4">
        {/* ... same UI as before */}
        <CardContent>
          {/* Show Disbursal Date, Amount, EMI, Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Disbursed On:</strong> {loan.disbursalDate || 'N/A'}</div>
            <div><strong>Amount:</strong> ₹{loan.amount}</div>
            <div><strong>EMI:</strong> ₹{loan.emi}</div>
            <div><strong>Duration:</strong> {loan.tenure} months</div>
          </div>
        </CardContent>
      </Card>

      {/* Payment schedule */}
      {/* Use your existing table and schedule logic here */}
    </>
  );
}
