"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
  Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogClose, Input, Label
} from '@/components/ui';

import { ArrowLeft, Download, Printer, Pencil, Loader2 } from 'lucide-react';
import { format, parseISO, addMonths, startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Emi {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending';
  paymentDate?: string;
  paymentMethod?: string;
}

interface Loan {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  tenure: number;
  interestRate: number;
  emi: number;
  processingFee: number;
  disbursalDate: string;
  notes?: string;
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Completed' | 'Rejected';
  repaymentSchedule: Emi[];
}

export default function LoanDetailsClient() {
  const router = useRouter();
  const params = useSearchParams();
  const loanId = params.get('id');
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const [editFields, setEditFields] = useState({
    customerName: '',
    amount: 0,
    tenure: 0,
    interestRate: 0,
    disbursalDate: '',
    notes: ''
  });

  // Load loan from Firestore
  useEffect(() => {
    const load = async () => {
      if (!loanId) return setLoading(false);
      try {
        const docSnap = await getDoc(doc(db, 'loans', loanId));
        if (!docSnap.exists()) {
          toast({ variant: 'destructive', title: 'Not found', description: 'Loan not found' });
          return;
        }
        const data = docSnap.data() as any;
        const fetched: Loan = { id: docSnap.id, ...data };
        const allPaid = fetched.repaymentSchedule.every(e => e.status === 'Paid');
        if (allPaid && fetched.status !== 'Completed') fetched.status = 'Completed';
        setLoan(fetched);

        setEditFields({
          customerName: fetched.customerName,
          amount: fetched.amount,
          tenure: fetched.tenure,
          interestRate: fetched.interestRate,
          disbursalDate: fetched.disbursalDate,
          notes: fetched.notes ?? ''
        });
      } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Error', description: 'Error loading loan' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [loanId, toast]);

  const detailedRepaymentSchedule = useMemo(() => {
    if (!loan) return [];
    const mrate = loan.interestRate / 12 / 100;
    let balance = loan.amount;
    return Array.from({ length: loan.tenure }, (_, i) => {
      const int = balance * mrate;
      const principle = loan.emi - int;
      balance -= principle;
      const emiObj = loan.repaymentSchedule.find(e => e.emiNumber === i + 1);
      return {
        month: i + 1,
        dueDate: emiObj?.dueDate ?? format(addMonths(startOfMonth(parseISO(loan.disbursalDate)), i + 1), 'yyyy-MM-dd'),
        principal: principle,
        interest: int,
        totalPayment: loan.emi,
        balance: balance < 0 ? 0 : balance,
        status: emiObj?.status ?? 'Pending',
        paymentDate: emiObj?.paymentDate ?? '---',
        remark: emiObj?.status === 'Paid' ? '––' : '---',
        receiptDownloadable: emiObj?.status === 'Paid'
      };
    });
  }, [loan]);

  // Update loan & schedule
  const handleUpdate = async () => {
    if (!loan) return;
    const { amount, tenure, interestRate, customerName, disbursalDate, notes } = editFields;
    if (amount < 0 || tenure < 1 || interestRate < 0) {
      return toast({ variant: 'destructive', title: 'Invalid input', description: 'Please correct the fields.' });
    }

    const mrate = interestRate / 12 / 100;
    const emiCalculated = Math.round(
      (amount * mrate * Math.pow(1 + mrate, tenure)) /
      (Math.pow(1 + mrate, tenure) - 1)
    );

    let bal = amount;
    const first = startOfMonth(addMonths(parseISO(disbursalDate), 1));
    const schedule: Emi[] = [];
    for (let i = 0; i < tenure; i++) {
      const interest = bal * mrate;
      const principle = emiCalculated - interest;
      bal -= principle;
      schedule.push({ emiNumber: i + 1, dueDate: format(addMonths(first, i), 'yyyy-MM-dd'), amount: emiCalculated, status: 'Pending' });
    }

    const upd = {
      customerName,
      amount,
      tenure,
      interestRate,
      emi: emiCalculated,
      disbursalDate,
      notes,
      repaymentSchedule: schedule
    };

    await updateDoc(doc(db, 'loans', loan.id), upd);
    setLoan(prev => prev ? { ...prev, ...upd } as Loan : prev);
    toast({ title: 'Updated', description: 'Loan data updated.' });
    setEditOpen(false);
  };

  if (loading) return <Loader2 className="animate-spin mx-auto mt-20 h-8 w-8" />;
  if (!loan) return (
    <div className="p-10 text-center">
      <p>No loan found!</p>
      <Button onClick={() => router.back()}>Go Back</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit Loan
        </Button>
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
          <div><strong>Status:</strong> <Badge>{loan.status}</Badge></div>
          <div className="col-span-2"><strong>Notes:</strong> {loan.notes ?? '—'}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Repayment Schedule</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>EMI #</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Interest</TableHead>
                <TableHead>Total Payment</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Paid Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailedRepaymentSchedule.map(r => (
                <TableRow key={r.month}>
                  <TableCell>{r.month}/{loan.tenure}</TableCell>
                  <TableCell>{r.dueDate}</TableCell>
                  <TableCell>₹{r.principal.toFixed(2)}</TableCell>
                  <TableCell>₹{r.interest.toFixed(2)}</TableCell>
                  <TableCell>₹{r.totalPayment.toFixed(2)}</TableCell>
                  <TableCell>₹{r.balance.toFixed(2)}</TableCell>
                  <TableCell>{r.paymentDate}</TableCell>
                  <TableCell><Badge variant={r.status === 'Paid' ? 'default' : 'outline'}>{r.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ——— Edit Dialog ——— */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {(['customerName','amount','tenure','interestRate','disbursalDate','notes'] as const).map(field => (
              <div key={field}>
                <Label>{field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</Label>
                <Input
                  type={field === 'disbursalDate' ? 'date' : field === 'amount' || field === 'tenure' || field === 'interestRate' ? 'number' : 'text'}
                  value={editFields[field] as any}
                  onChange={e => setEditFields(prev => ({ ...prev, [field]: field !== 'notes' ? e.target.value : e.target.value }))}
                />
              </div>
            ))}
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
