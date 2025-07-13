
"use client"


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

// Interfaces for type safety
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
  date: string; // Applied date
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


  useEffect(() => {
    if (loanId) {
      const fetchLoan = async () => {
        setLoading(true);
        try {
            const loanRef = doc(db, "loans", loanId);
            const docSnap = await getDoc(loanRef);

            if (docSnap.exists()) {
                const loanData = { id: docSnap.id, ...docSnap.data() } as Loan;
                
                // Check if all EMIs are paid and update status if needed
                const allPaid = loanData.repaymentSchedule?.every((emi: Emi) => emi.status === 'Paid');
                if (allPaid && loanData.status === 'Disbursed') {
                    loanData.status = 'Completed';
                    // Persist the status change to Firestore
                    await updateDoc(loanRef, { status: 'Completed' });
                }
                setLoan(loanData);
            } else {
                 toast({
                    variant: "destructive",
                    title: "Not Found",
                    description: "No such loan document!",
                });
            }
        } catch (error) {
            console.error("Failed to load loan data:", error);
            toast({
                variant: "destructive",
                title: "Load Failed",
                description: "Could not load loan details from Firestore.",
            });
        } finally {
            setLoading(false);
        }
      }
      fetchLoan();
    }
  }, [loanId, toast]);

  const paidEmisCount = loan?.repaymentSchedule?.filter(e => e.status === 'Paid').length || 0;
  const dueEmisCount = (loan?.tenure || 0) - paidEmisCount;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);
  };
  
  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved': return <Badge variant="secondary">{status}</Badge>;
          case 'Disbursed': return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
          case 'Completed': return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
          case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
          case 'Overdue': return <Badge variant="destructive">Overdue</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
  };

  const detailedRepaymentSchedule = useMemo(() => {
    if (!loan) return [];
    
    const { amount, interestRate, tenure, emi, repaymentSchedule } = loan;
    if (!emi || !amount || !interestRate || !tenure || !repaymentSchedule) return [];

    let balance = amount;
    const schedule = [];
    const monthlyInterestRate = interestRate / 12 / 100;

    for (let i = 1; i <= tenure; i++) {
      const interestPayment = balance * monthlyInterestRate;
      const principalPayment = emi - interestPayment;
      balance -= principalPayment;
      
      const existingEmi = repaymentSchedule.find((e: any) => e.emiNumber === i);

      schedule.push({
        month: i,
        dueDate: existingEmi?.dueDate || 'N/A',
        principal: principalPayment,
        interest: interestPayment,
        totalPayment: emi,
        balance: balance > 0 ? balance : 0,
        status: existingEmi?.status || 'Pending',
        paymentDate: existingEmi?.paymentDate || '---',
        remark: '---', // Placeholder
        receiptDownloadable: existingEmi?.status === 'Paid'
      });
    }
    return schedule;
  }, [loan]);

  const handleDownloadSchedule = async () => {
    if (!loan) return;
    setIsDownloadingSchedule(true);
    try {
        const pdfDoc = new jsPDF();
        
        pdfDoc.setFontSize(16);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("JLS Finance Company", pdfDoc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

        pdfDoc.setFontSize(14);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text('Loan Repayment Schedule', pdfDoc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
        
        pdfDoc.setFontSize(10);
        let contentStartY = 40;
        pdfDoc.text(`Customer: ${loan.customerName}`, 15, contentStartY);
        contentStartY += 7;
        pdfDoc.text(`Loan ID: ${loan.id}`, 15, contentStartY);
        contentStartY += 8;

        const tableColumn = ["EMI No.", "Due Date", "Principal", "Interest", "Total EMI", "Balance After", "Paid Date", "Status", "Remark"];
        const tableRows: (string | number)[][] = [];

        detailedRepaymentSchedule.forEach(emi => {
            const emiData = [
                `${emi.month}/${loan.tenure}`,
                emi.dueDate,
                formatCurrency(emi.principal),
                formatCurrency(emi.interest),
                formatCurrency(emi.totalPayment),
                formatCurrency(emi.balance),
                emi.paymentDate,
                emi.status,
                emi.remark
            ];
            tableRows.push(emiData);
        });

        autoTable(pdfDoc, {
            head: [tableColumn],
            body: tableRows,
            startY: contentStartY,
            theme: 'grid',
            headStyles: { fillColor: [46, 154, 254] },
            styles: { font: "helvetica", fontSize: 8 },
        });
        
        pdfDoc.save(`Payment_Schedule_${loan.id}.pdf`);
        toast({ title: "Schedule Downloaded!", description: "The payment schedule has been saved as a PDF." });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({ variant: "destructive", title: "Download Failed", description: "An error occurred while generating the PDF." });
    } finally {
        setIsDownloadingSchedule(false);
    }
  };


  const handleDownloadReceipt = async (emi: any) => {
      if (!loan) return;
      setIsDownloadingReceipt(emi.month);
      try {
        // Validate required data
        if (!loan.customerId || !emi.month || !loan.customerName) {
            toast({
                variant: "destructive",
                title: "Data Missing",
                description: "Cannot generate receipt due to incomplete loan data.",
            });
            setIsDownloadingReceipt(null);
            return;
        }

        const pdfDoc = new jsPDF();
        
        const customerRef = doc(db, "customers", loan.customerId);
        const customerSnap = await getDoc(customerRef);

        const headerY = 10;
        let y = headerY;
        
        pdfDoc.setFontSize(16);
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("JLS Finance Company", 105, y + 5, { align: 'center' });
        
        // Customer photo with fallback
        if (customerSnap.exists() && customerSnap.data().photo_url) {
            try {
                const imageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(customerSnap.data().photo_url)}`;
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
                const blob = await response.blob();
                const reader = new FileReader();
                const imgData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(blob);
                });
                pdfDoc.addImage(imgData, 165, headerY, 30, 30);
            } catch (e) {
                console.error("Could not add customer image to PDF:", e);
            }
        }
        
        y = headerY + 25;
        pdfDoc.setFontSize(14);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text("Payment Receipt", 105, y, { align: 'center' });
        
        y = Math.max(y, 50);
        y += 10;

        pdfDoc.setFontSize(11);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Receipt ID: RCPT-${loan.id}-${emi.month}`, 14, y);
        y += 7;
        
        let formattedDate = 'N/A';
        if (emi.paymentDate) {
            try {
                formattedDate = format(parseISO(emi.paymentDate), 'PPP');
            } catch (e) {
                console.error(`Invalid paymentDate format: ${emi.paymentDate}`);
            }
        }
        pdfDoc.text(`Payment Date: ${formattedDate}`, 14, y);
        y += 8;

        pdfDoc.line(14, y, 196, y);
        y += 10;

        pdfDoc.text(`Customer Name: ${loan.customerName}`, 14, y);
        y += 7;
        pdfDoc.text(`Loan ID: ${loan.id}`, 14, y);
        y += 8;

        pdfDoc.line(14, y, 196, y);
        y += 7;

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Description", 14, y);
        pdfDoc.text("Amount", 180, y, { align: 'right' });
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`EMI Payment (No. ${emi.month}/${loan.tenure})`, 14, y);
        pdfDoc.text(formatCurrency(loan.emi), 180, y, { align: 'right' });
        y += 10;

        pdfDoc.line(14, y, 196, y);
        
        y += 7;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Total Paid:", 130, y);
        pdfDoc.text(formatCurrency(loan.emi), 180, y, { align: 'right' });
        y += 13;

        const paymentMethod = loan.repaymentSchedule.find(e => e.emiNumber === emi.month)?.paymentMethod || 'N/A';
        pdfDoc.text(`Payment Method: ${paymentMethod.toUpperCase()}`, 14, y);

        pdfDoc.setFontSize(10);
        pdfDoc.text("This is a computer-generated receipt and does not require a signature.", 105, 280, { align: 'center' });
        
        pdfDoc.save(`Receipt_${loan.id}_EMI_${emi.month}.pdf`);
        toast({ title: "✅ Receipt Downloaded!" });
      } catch (error: any) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: error.message || "Could not generate the PDF receipt."
        });
      } finally {
        setIsDownloadingReceipt(null);
      }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
         <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-headline font-semibold">Loan Details</h1>
        <div className="flex items-center gap-2">
            <Button onClick={handleDownloadSchedule} disabled={isDownloadingSchedule || !loan.repaymentSchedule} className="bg-accent text-accent-foreground hover:bg-accent/90">
                {isDownloadingSchedule ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Download Schedule
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" />
                Print Page
            </Button>
             <Button variant="outline">                
                {/* Edit Loan Details */}
            </Button>
        </div>
      </div>
      
      <div>
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
                    <div><span className="font-medium text-muted-foreground block">Disbursed On</span>{loan.disbursalDate || 'N/A'}</div>
                    <div><span className="font-medium text-muted-foreground block">Loan Amount</span>{formatCurrency(loan.amount)}</div>
                    <div><span className="font-medium text-muted-foreground block">Monthly EMI</span>{formatCurrency(loan.emi)}</div>
                    <div><span className="font-medium text-muted-foreground block">Duration</span>{loan.tenure} Months</div>
                    <div><span className="font-medium text-muted-foreground block">EMIs Paid</span>{paidEmisCount} / {loan.tenure}</div>
                    <div><span className="font-medium text-muted-foreground block">EMIs Due</span>{dueEmisCount}</div>
                    <div><span className="font-medium text-muted-foreground block">Interest Rate</span>{loan.interestRate}% p.a.</div>
                    <div><span className="font-medium text-muted-foreground block">Processing Fee</span>{formatCurrency(loan.processingFee)}</div>
                </div>
            </CardContent>
        </Card>
        
        <Card className="mt-6 shadow-lg print-container">
            <CardHeader>
                <CardTitle>Payment Schedule</CardTitle>
                <CardDescription>A detailed breakdown of the loan repayment schedule.</CardDescription>
            </CardHeader>
            <CardContent id="printable-statement">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>EMI No.</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Principal</TableHead>
                            <TableHead>Interest</TableHead>
                            <TableHead>Total EMI</TableHead>
                            <TableHead>Balance After</TableHead>
                            <TableHead>Paid Date</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Remark</TableHead>
                            <TableHead className="text-center no-print">Receipt</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {detailedRepaymentSchedule.length > 0 ? detailedRepaymentSchedule.map((emi) => (
                            <TableRow key={emi.month}>
                                <TableCell className="font-medium">{emi.month}/{loan.tenure}</TableCell>
                                <TableCell>{emi.dueDate}</TableCell>
                                <TableCell>{formatCurrency(emi.principal)}</TableCell>
                                <TableCell>{formatCurrency(emi.interest)}</TableCell>
                                <TableCell>{formatCurrency(emi.totalPayment)}</TableCell>
                                <TableCell>{formatCurrency(emi.balance)}</TableCell>
                                <TableCell>{emi.paymentDate}</TableCell>
                                <TableCell>
                                  <Badge variant={emi.status === 'Paid' ? 'default' : 'outline'} className={emi.status === 'Paid' ? 'bg-accent text-accent-foreground' : ''}>
                                      {emi.status === 'Paid' ? '✅ ' : '⏳ '}{emi.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>{emi.remark}</TableCell>
                                <TableCell className="text-center no-print">
                                    {emi.receiptDownloadable ? (
                                        <Button variant="link" size="sm" onClick={() => handleDownloadReceipt(emi)} disabled={isDownloadingReceipt === emi.month}>
                                            {isDownloadingReceipt === emi.month ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        </Button>
                                    ) : '-'}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={10} className="h-24 text-center">No repayment schedule generated yet. Loan must be disbursed first.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
      </div>
    </div>
  )
}
