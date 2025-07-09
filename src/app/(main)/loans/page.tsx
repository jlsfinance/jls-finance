
"use client"
import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore'
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
            const q = query(collection(db, "loans"), orderBy("date", "desc"));
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
        const pdfDoc = new jsPDF();
        const customerRef = doc(db, "customers", loan.customerId);
        const customerSnap = await getDoc(customerRef);
        if (!customerSnap.exists()) {
            throw new Error("Customer details not found.");
        }
        const customer = customerSnap.data();

        const pageHeight = pdfDoc.internal.pageSize.height;
        const pageWidth = pdfDoc.internal.pageSize.width;
        const leftMargin = 15;
        const rightMargin = pageWidth - 15;
        const contentWidth = rightMargin - leftMargin;

        const addHeader = (pageNumber: number) => {
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(18);
            pdfDoc.text("JLS FINANCE LTD", pageWidth / 2, 15, { align: 'center' });
            pdfDoc.setFontSize(14);
            let title = "LOAN AGREEMENT";
            if (pageNumber > 1) title += " (continued)";
            pdfDoc.text(title, pageWidth / 2, 22, { align: 'center' });
            pdfDoc.setFont("helvetica", "normal");
            pdfDoc.setFontSize(10);
            pdfDoc.text(`Date: ${loan.disbursalDate || new Date().toLocaleDateString('en-GB')}`, rightMargin, 28, { align: 'right' });
        };
        const addFooter = (pageNumber: number) => {
            pdfDoc.setFontSize(10);
            pdfDoc.text(`Page ${pageNumber}/2`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        };

        // --- PAGE 1 ---
        addHeader(1);
        let y = 40;

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
                pdfDoc.addImage(imgData, 'JPEG', rightMargin - 30, y - 5, 30, 30);
            } catch (e) { console.error("Could not add customer image:", e); }
        }

        y += 5;
        const leftColX = leftMargin;
        const rightColX = leftMargin + (contentWidth / 2) + 5;
        
        pdfDoc.setFont(undefined, "bold");
        pdfDoc.text("Borrower Details", leftColX, y);
        pdfDoc.text("KYC Details", rightColX, y);
        y += 7;
        pdfDoc.setFont(undefined, "normal");

        const borrowerInfo = [
            { label: "Full Name", value: customer.name || 'N/A' },
            { label: "DOB", value: customer.dob || 'N/A' },
            { label: "Gender", value: customer.gender || 'N/A' },
            { label: "Marital Status", value: customer.maritalStatus || 'N/A' },
            { label: "Mobile No.", value: customer.mobile || 'N/A' },
            { label: "Address", value: customer.address || 'N/A' },
        ];
        
        const kycInfo = [
            { label: "Aadhaar No.", value: customer.aadhaar || 'N/A' },
            { label: "PAN No.", value: customer.pan || 'N/A' },
            { label: "Voter ID", value: customer.voter_id || 'N/A' },
        ];
        
        let leftY = y, rightY = y;
        borrowerInfo.forEach(info => {
            pdfDoc.setFont(undefined, "bold"); pdfDoc.text(`${info.label}:`, leftColX, leftY);
            pdfDoc.setFont(undefined, "normal");
            const valueLines = pdfDoc.splitTextToSize(info.value, rightColX - leftColX - 30);
            pdfDoc.text(valueLines, leftColX + 35, leftY);
            leftY += (valueLines.length * 5) + 3;
        });

        kycInfo.forEach(info => {
            pdfDoc.setFont(undefined, "bold"); pdfDoc.text(`${info.label}:`, rightColX, rightY);
            pdfDoc.setFont(undefined, "normal");
            const valueLines = pdfDoc.splitTextToSize(info.value, rightMargin - rightColX - 25);
            pdfDoc.text(valueLines, rightColX + 25, rightY);
            rightY += (valueLines.length * 5) + 3;
        });
        
        y = Math.max(leftY, rightY) + 5;

        if (customer.guarantor && customer.guarantor.name) {
            pdfDoc.line(leftMargin, y, rightMargin, y); y+=5;
            pdfDoc.setFont(undefined, "bold"); pdfDoc.text("Guarantor Details", leftColX, y); y+=7;
            pdfDoc.setFont(undefined, "normal");
            const guarantorInfo = [
                { label: "Name", value: customer.guarantor.name || 'N/A'},
                { label: "Relation", value: customer.guarantor.relation || 'N/A'},
                { label: "Mobile", value: customer.guarantor.mobile || 'N/A'},
                { label: "Address", value: customer.guarantor.address || 'N/A'},
            ];
            guarantorInfo.forEach(info => {
                 const valueLines = pdfDoc.splitTextToSize(info.value, contentWidth - 30);
                 pdfDoc.setFont(undefined, 'bold'); pdfDoc.text(`${info.label}:`, leftMargin + 5, y);
                 pdfDoc.setFont(undefined, 'normal'); pdfDoc.text(valueLines, leftMargin + 35, y);
                 y += (valueLines.length * 5) + 3;
            });
        }
        y += 5;

        pdfDoc.line(leftMargin, y, rightMargin, y); y+=5;
        pdfDoc.setFont(undefined, 'bold'); pdfDoc.text("Loan Summary", leftColX, y); y+=7;
        pdfDoc.setFont(undefined, 'normal');
        
        const loanTerms = [
            { label: "Loan ID", value: loan.id },
            { label: "Disbursal Date", value: loan.disbursalDate || 'N/A' },
            { label: "Loan Amount", value: `${formatCurrency(loan.amount)} (${toWords(loan.amount)} Only)` },
            { label: "Interest Rate", value: `${loan.interestRate}% per annum` },
            { label: "Tenure", value: `${loan.tenure} months` },
            { label: "EMI Amount", value: formatCurrency(loan.emi) },
            { label: "Total Repayment", value: formatCurrency(loan.emi * loan.tenure) },
            { label: "First EMI Date", value: "The 1st day of the month following disbursement." },
        ];
        loanTerms.forEach(term => {
            const valueLines = pdfDoc.splitTextToSize(term.value, contentWidth - 45);
            pdfDoc.setFont(undefined, 'bold'); pdfDoc.text(`${term.label}:`, leftMargin + 5, y);
            pdfDoc.setFont(undefined, 'normal'); pdfDoc.text(valueLines, leftMargin + 45, y);
            y += (valueLines.length * 5) + 3;
        });

        addFooter(1);

        // --- PAGE 2 ---
        pdfDoc.addPage();
        addHeader(2);
        y = 40;

        pdfDoc.setFont(undefined, 'bold'); pdfDoc.text("Terms & Conditions", leftMargin, y); y+=10;
        pdfDoc.setFont(undefined, 'normal');
        const clauses = [
            { title: "Security Clause", text: "This is an unsecured personal loan. No collateral or security has been provided by the Borrower to the Lender." },
            { title: "Prepayment", text: "No penalty will be charged for early repayment of the loan, in part or in full." },
            { title: "Late Payment", text: "Overdue payments will attract a penalty and additional interest as per the company's prevailing policy, which will be communicated separately." },
            { title: "Default Clause", text: "In the event of default on EMI payments for a continuous period as specified in the company policy, the entire outstanding loan amount, including any accrued interest and charges, will become immediately due and payable. The Lender reserves the right to initiate legal proceedings to recover the outstanding dues." },
            { title: "Arbitration Clause", text: "Any disputes arising from this agreement shall be resolved by arbitration in accordance with the Indian Arbitration and Conciliation Act, 1996. The arbitration shall take place in New Delhi." },
            { title: "Communication Clause", text: "All official communication shall be made via registered post or the email address provided by the borrower during the onboarding process. It is the borrower's responsibility to keep their contact information updated." },
            { title: "Governing Law", text: "This agreement is governed by the laws of India, and the courts of New Delhi shall have exclusive jurisdiction." },
            { title: "Severability Clause", text: "If any provision of this agreement is deemed invalid or unenforceable by a court of law, the remainder of the agreement shall continue to be in full force and effect." }
        ];

        clauses.forEach(clause => {
            pdfDoc.setFont('helvetica', 'bold');
            pdfDoc.text(clause.title, leftMargin, y); y += 6;
            pdfDoc.setFont('helvetica', 'normal');
            const content = pdfDoc.splitTextToSize(clause.text, contentWidth);
            pdfDoc.text(content, leftMargin, y);
            y += content.length * 5 + 8;
        });
        
        y = pageHeight - 70;
        const signatureBlockX1 = leftMargin;
        const signatureBlockX2 = rightMargin - 70;
        
        pdfDoc.text("_________________________", signatureBlockX1, y);
        pdfDoc.text("_________________________", signatureBlockX2, y);
        y += 5;
        pdfDoc.setFont(undefined, "bold");
        pdfDoc.text("Lender: JLS FINANCE LTD", signatureBlockX1, y);
        pdfDoc.text(`Borrower: ${customer.name}`, signatureBlockX2, y);
        y += 7;
        pdfDoc.text(`Date: ____________________`, signatureBlockX1, y);
        pdfDoc.text(`Date: ____________________`, signatureBlockX2, y);
        
        if (customer.guarantor && customer.guarantor.name) {
            y += 15;
            pdfDoc.text("_________________________", signatureBlockX1, y);
            y += 5;
            pdfDoc.setFont(undefined, "bold");
            pdfDoc.text(`Guarantor: ${customer.guarantor.name}`, signatureBlockX1, y);
            y += 7;
            pdfDoc.text(`Date: ____________________`, signatureBlockX1, y);
        }
        
        addFooter(2);
        
        const pdfBlob = pdfDoc.output('blob');
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
        const pdfDoc = new jsPDF();
        const customerRef = doc(db, "customers", loan.customerId);
        const customerSnap = await getDoc(customerRef);
        const customer = customerSnap.exists() ? customerSnap.data() : null;

        let y = 15;
        const pageWidth = pdfDoc.internal.pageSize.width;
        
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.setFontSize(16);
        pdfDoc.text('JLS FINANCE LTD', pageWidth / 2, y, { align: 'center' });
        y += 8;
        pdfDoc.setFontSize(12);
        pdfDoc.text('Loan Summary Card', pageWidth / 2, y, { align: 'center' });
        
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
                pdfDoc.addImage(imgData, 'JPEG', pageWidth - 15 - 30, 15, 30, 30);
            } catch (e) {
                console.error("Failed to add image to PDF:", e);
            }
        }
        
        y = Math.max(y, 50);
        
        const leftColX = 15;
        const rightColX = 110;
        const labelValueOffset = 35;

        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setFontSize(10);
        
        y += 5;
        const summary = [
            [{label: "Customer Name", value: loan.customerName}, {label: "Loan ID", value: loan.id}],
            [{label: "Loan Amount", value: formatCurrency(loan.amount)}, {label: "Interest Rate", value: `${loan.interestRate}% p.a.`}],
            [{label: "Tenure", value: `${loan.tenure} Months`}, {label: "Monthly EMI", value: formatCurrency(loan.emi)}],
        ];

        summary.forEach(row => {
            pdfDoc.setFont(undefined, "bold"); pdfDoc.text(`${row[0].label}:`, leftColX, y);
            pdfDoc.setFont(undefined, "normal"); pdfDoc.text(row[0].value, leftColX + labelValueOffset, y);

            pdfDoc.setFont(undefined, "bold"); pdfDoc.text(`${row[1].label}:`, rightColX, y);
            pdfDoc.setFont(undefined, "normal"); pdfDoc.text(row[1].value, rightColX + labelValueOffset, y);
            y += 7;
        });
        
        pdfDoc.setFont(undefined, "bold"); pdfDoc.text("Disbursal Date:", leftColX, y);
        pdfDoc.setFont(undefined, "normal"); pdfDoc.text(loan.disbursalDate || 'N/A', leftColX + labelValueOffset, y);
        y += 10;
        
        const formatDate = (dateString: string | undefined) => {
            if (!dateString) return '';
            const d = new Date(dateString);
            if (isNaN(d.getTime())) return '';
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const year = d.getFullYear();
            return `${day}-${month}-${year}`;
        };
        const formatCurrencyForTable = (value: number) => new Intl.NumberFormat("en-IN", {
            style: "decimal",
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);

        const head = [["EMI No", "Due Date", "Amount (₹)", "Principal", "Interest", "Balance", "Status"]];
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
                formatDate(emiData?.dueDate),
                formatCurrencyForTable(loan.emi),
                formatCurrencyForTable(principalPayment),
                formatCurrencyForTable(interestPayment),
                formatCurrencyForTable(balance > 0 ? balance : 0),
                emiData?.status === 'Paid' ? 'Paid' : ''
            ]);
        }
        
        autoTable(pdfDoc, { 
            head, 
            body, 
            startY: y, 
            theme: 'grid',
            headStyles: { fillColor: [46, 154, 254], textColor: 255 },
            styles: { font: "helvetica", fontSize: 8 },
            columnStyles: {
                2: { align: 'right' },
                3: { align: 'right' },
                4: { align: 'right' },
                5: { align: 'right' },
            }
        });
        
        const pdfBlob = pdfDoc.output('blob');
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
