
"use client"
import React, { useState, useMemo, useEffect, Fragment } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, FileDown, Download, Eye, Printer, Loader2 } from "lucide-react"
import Link from 'next/link'
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area';

interface Customer {
  id: string;
  name: string;
  photo: string;
}

const numberToWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const a = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const inWords = (n: number): string => {
        let str = '';
        if (n >= 100) {
            str += a[Math.floor(n / 100)] + ' hundred ';
            n %= 100;
        }
        if (n >= 20) {
            str += b[Math.floor(n / 10)] + ' ' + a[n % 10];
        } else {
            str += a[n];
        }
        return str.trim().replace(/\s+/g, ' ');
    }

    let result = '';
    const crore = Math.floor(num / 10000000);
    const lakh = Math.floor((num % 10000000) / 100000);
    const thousand = Math.floor((num % 100000) / 1000);
    const remaining = num % 1000;

    if (crore > 0) result += inWords(crore) + ' crore ';
    if (lakh > 0) result += inWords(lakh) + ' lakh ';
    if (thousand > 0) result += inWords(thousand) + ' thousand ';
    if (remaining > 0) result += inWords(remaining);
    
    return result.trim().replace(/^\w/, c => c.toUpperCase());
}

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loans, setLoans] = useState<any[]>([]);
  const { toast } = useToast();
  const [selectedLoan, setSelectedLoan] = useState<any | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    try {
        const storedLoans = localStorage.getItem('loanApplications');
        if (storedLoans) {
            const allLoans = JSON.parse(storedLoans)
            setLoans(allLoans.filter((loan: any) => loan.status !== 'Pending').sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        }
    } catch (error) {
        console.error("Failed to access localStorage:", error);
    }
  }, []);

  const filteredLoans = useMemo(() => {
    if (!searchTerm) return loans;
    const lowercasedFilter = searchTerm.toLowerCase()
    return loans.filter(loan =>
      loan.customerName.toLowerCase().includes(lowercasedFilter) ||
      loan.id.toLowerCase().includes(lowercasedFilter)
    )
  }, [searchTerm, loans])
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const detailedRepaymentSchedule = useMemo(() => {
    if (!selectedLoan) return { schedule: [], totalInterest: 0 };
    
    const { amount, interestRate, tenure, emi, repaymentSchedule } = selectedLoan;
    if (!emi || !amount || !interestRate || !tenure || !repaymentSchedule) return { schedule: [], totalInterest: 0 };

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
      });
    }
    
    const totalInterestPayable = (emi * tenure) - amount;
    return { schedule, totalInterest: totalInterestPayable };
  }, [selectedLoan]);

  const handlePrintSchedule = async () => {
    if (!selectedLoan) return;

    setIsPrinting(true);
    try {
        const doc = new jsPDF();
        
        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('JLS FINANCE LTD', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text('Payment Schedule', doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
        
        doc.setFontSize(11);
        doc.text(`Customer: ${selectedLoan.customerName}`, 20, 35);
        doc.text(`Loan ID: ${selectedLoan.id}`, 20, 42);
        doc.text(`Loan Amount: ${formatCurrency(selectedLoan.amount)}`, 20, 49);

        const tableColumn = ["EMI No.", "Due Date", "Principal", "Interest", "Total EMI", "Balance After", "Paid Date", "Status", "Remark"];
        const tableRows: (string | number)[][] = [];

        detailedRepaymentSchedule.schedule.forEach(emi => {
            const emiData = [
                `${emi.month}/${selectedLoan.tenure}`,
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

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [46, 154, 254] },
            styles: { font: "helvetica", fontSize: 8 }
        });

        doc.save(`Payment_Schedule_${selectedLoan.id}.pdf`);
        toast({
            title: "Download Successful",
            description: "Payment schedule PDF downloaded successfully!",
        });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not generate the PDF.",
        });
    } finally {
        setIsPrinting(false);
    }
};

  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved':
              return <Badge variant="secondary">{status}</Badge>;
          case 'Disbursed':
              return <Badge variant="default" className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
          case 'Completed':
              return <Badge variant="default" className="bg-accent text-accent-foreground">{status}</Badge>;
          case 'Rejected':
              return <Badge variant="destructive">{status}</Badge>;
          default:
              return <Badge variant="outline">{status}</Badge>;
      }
  }

  const handleDownloadAgreement = (loan: any) => {
    try {
        const storedCustomers = localStorage.getItem('customers');
        const customers: Customer[] = storedCustomers ? JSON.parse(storedCustomers) : [];
        const customer = customers.find((c: Customer) => c.id === loan.customerId);

        const doc = new jsPDF();
        const amountInWords = numberToWords(loan.amount);
        let yPos = 15;
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JLS FINANCE LTD", 105, yPos, { align: 'center' });
        yPos += 10;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("LOAN AGREEMENT", 105, yPos, { align: 'center' });
        yPos += 8;
        doc.setLineWidth(0.5);
        doc.line(20, yPos, 190, yPos);
        yPos += 12;

        doc.setFontSize(12);
        const writeDetail = (label: string, value: string, isBold: boolean = false) => {
            const splitValue = doc.splitTextToSize(value, 110);
            doc.setFont("helvetica", "normal");
            doc.text(label, 20, yPos);
            if (isBold) doc.setFont("helvetica", "bold");
            doc.text(splitValue, 60, yPos);
            if (isBold) doc.setFont("helvetica", "normal");
            yPos += (splitValue.length * 5) + 5;
        };

        writeDetail("Loan ID:", loan.id);
        writeDetail("Date:", new Date(loan.date).toLocaleDateString('en-GB'));
        writeDetail("Borrower:", loan.customerName, true);
        writeDetail("Loan Amount:", `₹${loan.amount.toLocaleString('en-IN')} (${amountInWords} Rupees Only)`, true);
        writeDetail("Loan Tenure:", `${loan.tenure} Months`, true);
        writeDetail("Interest Rate:", `${loan.interestRate}% p.a.`);
        
        yPos += 5;
        doc.line(20, yPos, 190, yPos);
        yPos += 15;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Terms and Conditions", 20, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        
        const terms = [
            "1. The Borrower agrees to repay the loan amount along with interest as per the agreed schedule of EMIs on the 1st of every month.",
            "2. All payments shall be made on or before the due date. A late payment fee will be applicable for any delays as per the company's policy.",
            "3. The interest rate is fixed for the duration of the loan, unless specified otherwise in writing.",
            "4. In case of default on repayment, JLS FINANCE LTD reserves the right to take appropriate legal action and report the default to credit bureaus, which may affect the Borrower's credit score.",
            "5. The processing fee paid at the time of loan disbursal is non-refundable under any circumstances.",
            "6. This loan agreement is subject to the jurisdiction of the local courts where the lender's branch is located.",
            "7. Prepayment of the loan is allowed, subject to applicable prepayment charges as per the company policy.",
            "8. All information provided by the borrower is declared to be true and correct to the best of their knowledge. Any misrepresentation shall be considered a breach of this agreement.",
        ];
        
        terms.forEach(term => {
            const splitText = doc.splitTextToSize(term, 170);
            if (yPos + (splitText.length * 5) > 280) {
                doc.addPage();
                yPos = 20;
            }
            doc.text(splitText, 20, yPos);
            yPos += (splitText.length * 5) + 3;
        });
        
        yPos += 20;
        if (yPos > 250) {
            doc.addPage();
            yPos = 40;
        }
        
        doc.line(20, yPos - 5, 190, yPos - 5);
        doc.setFontSize(12);
        doc.text("Borrower's Signature:", 20, yPos + 20);
        doc.line(65, yPos + 20, 120, yPos + 20);
        
        doc.text("For JLS FINANCE LTD:", 130, yPos + 20);
        doc.line(175, yPos + 20, 190, yPos + 20);

        doc.setFontSize(10);
        doc.text("(Authorized Signatory)", 130, yPos + 25);

        doc.save(`Loan_Agreement_${loan.id}.pdf`);
        toast({ title: "Agreement Downloaded!", description: `Loan Agreement for ${loan.id} downloaded.` });
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Download Failed", description: "Could not generate the agreement PDF." });
    }
  };

  return (
    <Fragment>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-headline font-semibold">All Loans</h1>
          <div className="flex items-center gap-2">
              <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
              </Button>
              <Link href="/loans/new">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      New Loan Application
                  </Button>
              </Link>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by Customer Name, Loan ID..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Loan ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Loan Agreement</TableHead>
                <TableHead>Payment Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLoans.length > 0 ? filteredLoans.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">{loan.id}</TableCell>
                  <TableCell>{loan.customerName}</TableCell>
                  <TableCell>₹{loan.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>
                      <div className="flex flex-col text-sm">
                          <span>Applied: {loan.date}</span>
                          {loan.approvalDate && <span>Approved: {loan.approvalDate}</span>}
                          {loan.disbursalDate && <span>Disbursed: {loan.disbursalDate}</span>}
                      </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(loan.status)}
                  </TableCell>
                  <TableCell>
                      <Button variant="link" size="sm" asChild>
                          <Link href={`/loans/details?id=${loan.id}`}>View Details</Link>
                      </Button>
                  </TableCell>
                  <TableCell>
                      {loan.status === 'Disbursed' && (
                        <Button variant="outline" size="sm" onClick={() => handleDownloadAgreement(loan)}>
                            <Download className="h-4 w-4" />
                        </Button>
                      )}
                  </TableCell>
                  <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setSelectedLoan(loan)} disabled={!loan.repaymentSchedule}>
                          <Eye className="h-4 w-4" />
                      </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center h-24">
                    No loans found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
      
      <Dialog open={!!selectedLoan} onOpenChange={(isOpen) => !isOpen && setSelectedLoan(null)}>
        <DialogContent className="max-w-4xl">
            <DialogHeader>
                <DialogTitle>Payment Schedule Preview</DialogTitle>
                <DialogDescription>
                    Loan ID: {selectedLoan?.id} | Customer: {selectedLoan?.customerName}
                </DialogDescription>
            </DialogHeader>
            {selectedLoan && (
            <Fragment>
                <div id="printable-schedule" className="bg-background text-foreground p-4 print-content">
                    <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                        <div>
                            <p className="text-sm text-muted-foreground">Monthly Payment</p>
                            <p className="font-bold text-lg">{formatCurrency(selectedLoan.emi)}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Interest</p>
                            <p className="font-bold text-lg">{formatCurrency(detailedRepaymentSchedule.totalInterest)}</p>
                        </div>
                    </div>
                    <ScrollArea className="h-[50vh] border rounded-md">
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {detailedRepaymentSchedule.schedule.map((row) => (
                                    <TableRow key={row.month}>
                                        <TableCell>{row.month}/{selectedLoan.tenure}</TableCell>
                                        <TableCell>{row.dueDate}</TableCell>
                                        <TableCell>{formatCurrency(row.principal)}</TableCell>
                                        <TableCell>{formatCurrency(row.interest)}</TableCell>
                                        <TableCell>{formatCurrency(row.totalPayment)}</TableCell>
                                        <TableCell>{formatCurrency(row.balance)}</TableCell>
                                        <TableCell>{row.paymentDate}</TableCell>
                                        <TableCell>
                                            <Badge variant={row.status === 'Paid' ? 'default' : 'outline'} className={row.status === 'Paid' ? 'bg-accent text-accent-foreground' : ''}>
                                                {row.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{row.remark}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setSelectedLoan(null)}>Close</Button>
                    <Button onClick={handlePrintSchedule} disabled={isPrinting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                        {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                        Download as PDF
                    </Button>
                </DialogFooter>
            </Fragment>
            )}
        </DialogContent>
      </Dialog>
    </Fragment>
  )
}
