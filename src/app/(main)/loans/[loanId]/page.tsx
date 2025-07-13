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
import { ArrowLeft, Download, Printer, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO, addMonths, startOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Emi { /* ... same */ }
interface Loan { /* ... same */ }

export default function LoanDetailsPage() {
  const router = useRouter();
  const { loanId } = useParams();
  const { toast } = useToast();

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDownloadingSchedule, setIsDownloadingSchedule] = useState(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<number|null>(null);

  // ✏️ Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editAmount, setEditAmount] = useState(0);
  const [editTenure, setEditTenure] = useState(0);
  const [editInterestRate, setEditInterestRate] = useState(0);
  const [editDisbursalDate, setEditDisbursalDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  // Load loan data
  useEffect(() => {
    if (!loanId) return;
    (async() => {
      setLoading(true);
      try {
        const ref = doc(db, "loans", loanId);
        console.log("loanId value : " + loanId);
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

  // EMI schedule generator
  const detailedRepaymentSchedule = useMemo(() => {
    if (!loan) return [];
    const monthlyRate = loan.interestRate / 12 / 100;
    let bal = loan.amount;
    const arr = [];
    const first = startOfMonth(addMonths(parseISO(loan.disbursalDate!), 1));
    for(let i=0;i<loan.tenure;i++){
      const interest = bal * monthlyRate;
      const principal = loan.emi - interest;
      bal -= principal;
      arr.push({ month: i+1, dueDate: format(addMonths(first, i), 'yyyy-MM-dd'), totalPayment: loan.emi, principal, interest, balance: bal < 0 ? 0 : bal, status: 'Pending', paymentDate:'', remark:'---', receiptDownloadable: false });
    }
    return arr;
  }, [loan]);

  // 🔁 Update loan & schedule
  const handleUpdateLoan = async () => {
    if (!loan) return;
    try {
      const monthlyRate = editInterestRate/12/100;
      const emiCalc = Math.round(
        (editAmount * monthlyRate * Math.pow(1+monthlyRate, editTenure))/
        (Math.pow(1+monthlyRate, editTenure)-1)
      );
      const schedule = [];
      let bal = editAmount;
      const first = startOfMonth(addMonths(parseISO(editDisbursalDate),1));
      for(let i=0;i<editTenure;i++){
        const interest = bal * monthlyRate;
        const principal = emiCalc - interest;
        bal -= principal;
        schedule.push({
          emiNumber: i+1,
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
      await updateDoc(doc(db,"loans",loan.id), updated);
      setLoan(prev => prev?{...prev,...updated} : prev);
      toast({ title:"Loan Updated", description:"Loan details updated successfully." });
      setEditOpen(false);
    } catch (err) {
      console.error(err);
      toast({variant:"destructive", title:"Update Failed", description:"Could not update loan."});
    }
  };

  if (loading) return <Loader2 className="mx-auto animate-spin h-8 w-8"/>;
  if (!loan) return (
    <div>Loan not found. <Button onClick={()=>router.back()}>Back</Button></div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button onClick={()=>router.back()} variant="outline"><ArrowLeft/> Back</Button>
        <Button onClick={()=>setEditOpen(true)}>✏️ Edit Loan</Button>
      </div>

      {/* Details Card */}
      <Card>...</Card>
      {/* Schedule & Receipts Card */}
      <Card>...</Card>

      {/* ✏️ Edit Loan Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Loan</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Amount</Label>
              <Input value={editAmount} type="number" onChange={e=>setEditAmount(Number(e.target.value))}/>
            </div>
            <div>
              <Label>Tenure (months)</Label>
              <Input value={editTenure} type="number" onChange={e=>setEditTenure(Number(e.target.value))}/>
            </div>
            <div>
              <Label>Interest Rate (%)</Label>
              <Input value={editInterestRate} type="number" onChange={e=>setEditInterestRate(Number(e.target.value))}/>
            </div>
            <div>
              <Label>Disbursal Date</Label>
              <Input placeholder="yyyy-mm-dd" value={editDisbursalDate} onChange={e=>setEditDisbursalDate(e.target.value)}/>
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
