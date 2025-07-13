"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Printer, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

interface Emi {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending';
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
  status: 'Pending' | 'Approved' | 'Disbursed' | 'Rejected' | 'Completed';
  approvalDate?: string;
  disbursalDate?: string;
  repaymentSchedule: Emi[];
}

export default function LoanDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const loanId = params.loanId as string;
  const { toast } = useToast();
  
  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingSchedule, setIsDownloadingSchedule] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    amount: 0,
    interestRate: 0,
    tenure: 0,
    processingFee: 0,
  });

  useEffect(() => {
    if (loanId) {
      const fetchLoan = async () => {
        setLoading(true);
        try {
          const loanRef = doc(db, "loans", loanId);
          const docSnap = await getDoc(loanRef);

          if (docSnap.exists()) {
            const loanData = { id: docSnap.id, ...docSnap.data() } as Loan;

            const allPaid = loanData.repaymentSchedule?.every((emi: Emi) => emi.status === 'Paid');
            if (allPaid && loanData.status === 'Disbursed') {
              loanData.status = 'Completed';
              await updateDoc(loanRef, { status: 'Completed' });
            }

            setLoan(loanData);
            setEditForm({
              amount: loanData.amount,
              interestRate: loanData.interestRate,
              tenure: loanData.tenure,
              processingFee: loanData.processingFee,
            });
          } else {
            toast({ variant: "destructive", title: "Not Found", description: "No such loan document!" });
          }
        } catch (error) {
          console.error("Failed to load loan data:", error);
          toast({ variant: "destructive", title: "Load Failed", description: "Could not load loan details." });
        } finally {
          setLoading(false);
        }
      };
      fetchLoan();
    }
  }, [loanId, toast]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <Badge variant="secondary">{status}</Badge>;
      case 'Disbursed': return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
      case 'Completed': return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
      case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const detailedRepaymentSchedule = useMemo(() => {
    if (!loan) return [];
    const { amount, interestRate, tenure, emi, repaymentSchedule } = loan;
    if (!emi || !amount || !interestRate || !tenure || !repaymentSchedule) return [];

    let balance = amount;
    const monthlyInterestRate = interestRate / 12 / 100;

    return Array.from({ length: tenure }, (_, i) => {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;

      const existingEmi = repaymentSchedule.find(e => e.emiNumber === i + 1);

      return {
        month: i + 1,
        dueDate: existingEmi?.dueDate || 'N/A',
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: emi,
        balance: balance > 0 ? balance : 0,
        status: existingEmi?.status || 'Pending',
        paymentDate: existingEmi?.paymentDate || '---',
        remark: '---',
        receiptDownloadable: existingEmi?.status === 'Paid',
      };
    });
  }, [loan]);

  const handleLoanUpdate = async () => {
    if (!loan) return;
    try {
      const loanRef = doc(db, "loans", loan.id);
      await updateDoc(loanRef, {
        amount: editForm.amount,
        interestRate: editForm.interestRate,
        tenure: editForm.tenure,
        processingFee: editForm.processingFee,
      });
      toast({ title: "Loan updated successfully!" });
      setIsEditing(false);
      location.reload(); // Optional: to reload data
    } catch (e) {
      console.error(e);
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!loan) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Loan Not Found</CardTitle>
          <CardDescription>The loan you are trying to access does not exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/loans')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Loans List
          </Button>
        </CardContent>
      </Card>
    );
  }

  const paidEmisCount = loan.repaymentSchedule.filter(e => e.status === 'Paid').length;
  const dueEmisCount = loan.tenure - paidEmisCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-headline font-semibold">Loan Details</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>✏️ Edit</Button>
          <Button onClick={() => {}} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {isDownloadingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download Schedule
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Print Page
          </Button>
        </div>
      </div>

      {/* Loan Summary Card */}
      <Card className="shadow-lg print-container">
        <CardHeader className="bg-primary/5">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{loan.customerName}</CardTitle>
              <CardDescription>Loan ID: {loan.id}</CardDescription>
            </div>
            {getStatusBadge(loan.status)}
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div><span className="font-medium text-muted-foreground block
