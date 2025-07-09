
"use client"
import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy as firestoreOrderBy, doc as firestoreDoc, getDoc } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, Loader2, FileText, CreditCard, Download } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);

const toWords = (num: number): string => {
    if (num === 0) return 'Zero';
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const inWords = (n: number) => {
        let str = '';
        if (n > 99) {
            str += a[Math.floor(n / 100)] + 'hundred ';
            n %= 100;
        }
        if (n > 19) {
            str += b[Math.floor(n / 10)] + (a[n % 10] ? '' + a[n % 10] : '');
        } else {
            str += a[n];
        }
        return str;
    };
    let words = '';
    if (num >= 10000000) {
        words += inWords(Math.floor(num / 10000000)) + 'crore ';
        num %= 10000000;
    }
    if (num >= 100000) {
        words += inWords(Math.floor(num / 100000)) + 'lakh ';
        num %= 100000;
    }
    if (num >= 1000) {
        words += inWords(Math.floor(num / 1000)) + 'thousand ';
        num %= 1000;
    }
    if (num > 0) {
      words += inWords(num);
    }
    return words.replace(/\s+/g, ' ').trim().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function LoansPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState('');
  const [currentPdfBlob, setCurrentPdfBlob] = useState<Blob | null>(null);
  const [currentPdfName, setCurrentPdfName] = useState('');


  useEffect(() => {
    const fetchLoans = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "loans"), firestoreOrderBy("date", "desc"));
            const querySnapshot = await getDocs(q);
            const loansData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLoans(loansData);
        } catch (error) {
            console.error("Error fetching loans:", error);
            toast({
                variant: "destructive",
                title: "Failed to load loans",
                description: "Could not fetch loan data from Firestore.",
            });
        } finally {
            setLoading(false);
        }
    };
    fetchLoans();
  }, [toast]);

  const filteredLoans = useMemo(() => {
    if (!searchTerm) return loans;
    const lowercasedFilter = searchTerm.toLowerCase()
    return loans.filter(loan =>
      (loan.customerName && loan.customerName.toLowerCase().includes(lowercasedFilter)) ||
      (loan.id && loan.id.toLowerCase().includes(lowercasedFilter))
    )
  }, [searchTerm, loans])
  
  const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved':
              return <Badge variant="secondary">{status}</Badge>;
          case 'Disbursed':
              return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
          case 'Completed':
              return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
          case 'Rejected':
              return <Badge variant="destructive">{status}</Badge>;
          default:
              return <Badge variant="outline">{status}</Badge>;
      }
  }

 const generateLoanAgreement = async (loan: any) => {
    setIsDialogOpen(true);
    setIsGeneratingPdf(true);
    setPdfTitle("Loan Agreement");
    setCurrentPdfName(`Loan_Agreement_${loan.id}.pdf`);

    try {
        const doc = new jsPDF();
        const customerRef = firestoreDoc(db, "customers", loan.customerId);
        const customerSnap = await getDoc(customerRef);
        if (!customerSnap.exists()) {
            throw new Error("Customer details not found.");
        }
        const customer = customerSnap.data();

        let y = 15;
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        const leftMargin = 15;
        const rightMargin = pageWidth - 15;
        const contentWidth = rightMargin - leftMargin;

        // --- Helper function for sections ---
        const addSection = (title: string, content: string[], startY: number): number => {
            let currentY = startY;
            doc.setFont(undefined, "bold");
            doc.text(title, leftMargin, currentY);
            currentY += 7;
            doc.setFont(undefined, "normal");

            const splitContent = content.flatMap(line => doc.splitTextToSize(line, contentWidth - 5)); // 5 for indent
            
            const sectionHeight = (splitContent.length * 5) + 5;
            if (currentY + sectionHeight > pageHeight - 20) {
                doc.addPage();
                currentY = 20;
            }

            doc.text(splitContent, leftMargin + 5, currentY);
            currentY += splitContent.length * 5 + 8;
            return currentY;
        };

        // --- Page 1 Header ---
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text("JLS FINANCE LTD", pageWidth / 2, y, { align: 'center' });
        y += 10;
        doc.setFontSize(14);
        doc.text("LOAN AGREEMENT", pageWidth / 2, y, { align: 'center' });
        y += 7;
        doc.setFontSize(10);
        doc.setFont("times", "normal");
        doc.text(`Date: ${loan.disbursalDate || new Date().toLocaleDateString('en-GB')}`, rightMargin, y, { align: 'right' });
        y += 5;

        // --- Customer Photo ---
        if (customer.photo_url) {
            try {
                const imageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(customer.photo_url)}`;
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const imgData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(imgData, 'JPEG', rightMargin - 30, 15, 30, 30);
            } catch (e) {
                console.error("Could not add customer image to PDF:", e);
            }
        }
        
        y = Math.max(y, 50);
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;

        // --- Two Column Layout ---
        let leftY = y;
        let rightY = y;
        const midPoint = pageWidth / 2 + 5;

        // Left Column: Borrower Details
        doc.setFont(undefined, "bold");
        doc.text("Borrower Details", leftMargin, leftY);
        leftY += 7;
        doc.setFont(undefined, "normal");

        const borrowerInfo: { label: string, value: string }[] = [
            { label: "Full Name", value: customer.name || 'N/A' },
            { label: "Date of Birth", value: customer.dob || 'N/A' },
            { label: "Gender", value: customer.gender || 'N/A' },
            { label: "Marital Status", value: customer.maritalStatus || 'N/A' },
            { label: "Mobile No.", value: customer.mobile || 'N/A' },
            { label: "Address", value: customer.address || 'N/A' },
        ];
        
        borrowerInfo.forEach(info => {
            doc.setFont(undefined, "bold");
            doc.text(`${info.label}:`, leftMargin, leftY);
            doc.setFont(undefined, "normal");
            const valueLines = doc.splitTextToSize(info.value, (midPoint - leftMargin - 38));
            doc.text(valueLines, leftMargin + 35, leftY);
            leftY += (valueLines.length * 5) + 3;
        });

        // Right Column: KYC Details
        doc.setFont(undefined, "bold");
        doc.text("KYC Details", midPoint, rightY);
        rightY += 7;
        doc.setFont(undefined, "normal");

        const kycInfo = [
            { label: "Aadhar No.", value: customer.aadhaar || 'N/A' },
            { label: "PAN No.", value: customer.pan || 'N/A' },
            { label: "Voter ID", value: customer.voter_id || 'N/A' },
        ];

        kycInfo.forEach(info => {
            doc.setFont(undefined, "bold");
            doc.text(`${info.label}:`, midPoint, rightY);
            doc.setFont(undefined, "normal");
            const valueLines = doc.splitTextToSize(info.value, (rightMargin - midPoint - 28));
            doc.text(valueLines, midPoint + 25, rightY);
            rightY += (valueLines.length * 5) + 3;
        });
        
        y = Math.max(leftY, rightY) + 5;
        doc.line(leftMargin, y, rightMargin, y);
        y += 8;

        // --- Loan Details ---
        const totalRepayment = loan.emi * loan.tenure;
        y = addSection("Loan Details", [
            `Loan Amount: ${formatCurrency(loan.amount)} (Rupees ${toWords(loan.amount)} Only)`,
            `Interest Rate: ${loan.interestRate}% per annum`,
            `Tenure: ${loan.tenure} months`,
            `EMI Amount: ${formatCurrency(loan.emi)}`,
            `Total Repayment Amount: ${formatCurrency(totalRepayment)}`,
            `First EMI Date: The 1st day of the month following the disbursement date.`,
            `Prepayment Clause: No penalty will be charged for early repayment of the loan.`,
            `Late Payment Clause: Overdue payments will attract a penalty and additional interest as per the company's prevailing policy.`
        ], y);
        
        // --- Guarantor Details ---
        if (customer.guarantor && customer.guarantor.name) {
             y = addSection("Guarantor Details", [
                `Name: ${customer.guarantor.name || 'N/A'}`,
                `Relation to Borrower: ${customer.guarantor.relation || 'N/A'}`,
                `Mobile No.: ${customer.guarantor.mobile || 'N/A'}`,
                `Address: ${customer.guarantor.address || 'N/A'}`,
            ], y);
        }

        // --- Legal Clauses (Potentially on new page) ---
        if (y > 180) {
            doc.addPage();
            y = 20;
        }

        y = addSection("Security Clause", ["This is an unsecured personal loan. No collateral or security has been provided by the Borrower to the Lender."], y);
        y = addSection("Default Clause", ["In the event of default on EMI payments for a continuous period as specified in the company policy, the entire outstanding loan amount, including any accrued interest and charges, will become immediately due and payable. The Lender reserves the right to initiate legal proceedings to recover the outstanding dues."], y);
        y = addSection("Other Terms", [
            "Any amendments, modifications, or waivers to this agreement must be documented in writing and signed by both the Lender and the Borrower.",
            "All official notices pertaining to this agreement shall be delivered to the addresses provided herein via registered post or a recognized courier service.",
            "This agreement shall be governed by the laws of India. All disputes arising from this agreement are subject to the exclusive jurisdiction of the courts in New Delhi."
        ], y);

        // --- Signature Section ---
        if (y > pageHeight - 80) {
            doc.addPage();
            y = 40;
        } else {
            y = pageHeight - 80;
        }

        doc.text("_________________________", leftMargin, y);
        doc.text("_________________________", midPoint, y);
        y += 5;
        doc.setFont(undefined, "bold");
        doc.text("Lender (JLS FINANCE LTD)", leftMargin, y);
        doc.text(`Borrower: ${customer.name}`, midPoint, y);
        doc.setFont(undefined, "normal");
        y += 7;
        doc.text(`Date: ____________________`, leftMargin, y);
        doc.text(`Date: ____________________`, midPoint, y);
        
        if (customer.guarantor && customer.guarantor.name) {
            y += 15;
            doc.text("_________________________", leftMargin, y);
            y += 5;
            doc.setFont(undefined, "bold");
            doc.text(`Guarantor: ${customer.guarantor.name}`, leftMargin, y);
            doc.setFont(undefined, "normal");
            y += 7;
            doc.text(`Date: ____________________`, leftMargin, y);
        }
        
        const pdfBlob = doc.output('blob');
        setCurrentPdfBlob(pdfBlob);
        setPdfPreviewUrl(URL.createObjectURL(pdfBlob));

    } catch (error: any) {
        console.error("PDF generation failed:", error);
        toast({ variant: "destructive", title: "PDF Generation Failed", description: error.message });
        setIsDialogOpen(false);
    } finally {
        setIsGeneratingPdf(false);
    }
  }

  const generateLoanCard = async (loan: any) => {
    setIsDialogOpen(true);
    setIsGeneratingPdf(true);
    setPdfTitle("Loan Card (EMI Schedule)");
    setCurrentPdfName(`Loan_Card_${loan.id}.pdf`);
    
    try {
        const customerRef = firestoreDoc(db, "customers", loan.customerId);
        const customerSnap = await getDoc(customerRef);
        const customer = customerSnap.exists() ? customerSnap.data() : null;

        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('JLS FINANCE LTD', 105, y, { align: 'center' });
        y += 10;
        
        if (customer?.photo_url) {
            try {
                const response = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(customer.photo_url)}`);
                const blob = await response.blob();
                const reader = new FileReader();
                const imgData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(imgData, 'JPEG', 165, 15, 30, 30);
            } catch (e) {
                console.error("Failed to add image to PDF:", e);
            }
        }
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(`Customer: ${loan.customerName}`, 14, y);
        doc.text(`Loan ID: ${loan.id}`, doc.internal.pageSize.getWidth() - 14, y, { align: 'right' });
        y += 7;
        doc.text(`Amount: ${formatCurrency(loan.amount)}`, 14, y);
        doc.text(`Start Date: ${loan.disbursalDate || 'N/A'}`, doc.internal.pageSize.getWidth() - 14, y, { align: 'right' });
        y += 10;

        const head = [["Month", "Principal", "Interest", "Total EMI", "Balance", "Paid Date", "Remark"]];
        const body: any[] = [];
        let balance = loan.amount;
        const monthlyInterestRate = loan.interestRate / 12 / 100;

        for (let i = 1; i <= loan.tenure; i++) {
            const interestPayment = balance * monthlyInterestRate;
            const principalPayment = loan.emi - interestPayment;
            balance -= principalPayment;
            const emiData = loan.repaymentSchedule?.find((e: any) => e.emiNumber === i);
            body.push([
                i,
                formatCurrency(principalPayment),
                formatCurrency(interestPayment),
                formatCurrency(loan.emi),
                formatCurrency(balance > 0 ? balance : 0),
                emiData?.paymentDate || '---',
                emiData?.status || 'Pending'
            ]);
        }
        
        autoTable(doc, { head, body, startY: y, theme: 'grid' });
        
        const pdfBlob = doc.output('blob');
        setCurrentPdfBlob(pdfBlob);
        setPdfPreviewUrl(URL.createObjectURL(pdfBlob));

    } catch (error: any) {
         toast({ variant: "destructive", title: "PDF Generation Failed", description: error.message });
         setIsDialogOpen(false);
    } finally {
        setIsGeneratingPdf(false);
    }
  }

  const handleDownload = () => {
    if (currentPdfBlob && currentPdfName) {
        const url = window.URL.createObjectURL(currentPdfBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = currentPdfName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    }
  };

  const isActionable = (status: string) => ['Approved', 'Disbursed', 'Completed'].includes(status);

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-headline font-semibold">All Loans</h1>
          <Link href="/loans/new">
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Loan Application
              </Button>
          </Link>
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
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                    </TableCell>
                </TableRow>
              ) : filteredLoans.length > 0 ? filteredLoans.map((loan) => (
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
                  <TableCell className="flex justify-center items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                          <Link href={`/loans/${loan.id}`}>View Details</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => generateLoanAgreement(loan)} disabled={!isActionable(loan.status) || isGeneratingPdf}>
                          <FileText className="mr-2 h-4 w-4" /> Agreement
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => generateLoanCard(loan)} disabled={!isActionable(loan.status) || isGeneratingPdf || !loan.repaymentSchedule}>
                          <CreditCard className="mr-2 h-4 w-4" /> Loan Card
                      </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No loans found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

    <Dialog open={isDialogOpen} onOpenChange={(isOpen) => {
        if (!isOpen) {
            if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
            setPdfPreviewUrl(null); 
            setCurrentPdfBlob(null);
        }
        setIsDialogOpen(isOpen);
    }}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>{pdfTitle}</DialogTitle>
                <DialogDescription>
                    Preview of the generated document. You can download it using the button below.
                </DialogDescription>
            </DialogHeader>
            <div className="flex-grow flex items-center justify-center border rounded-md overflow-hidden bg-muted">
                {isGeneratingPdf ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p>Generating PDF...</p>
                    </div>
                ) : pdfPreviewUrl ? (
                    <iframe src={pdfPreviewUrl} className="w-full h-full" title={pdfTitle} />
                ) : (
                    <p>Could not generate PDF preview.</p>
                )}
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                </DialogClose>
                <Button onClick={handleDownload} disabled={!pdfPreviewUrl || isGeneratingPdf}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
