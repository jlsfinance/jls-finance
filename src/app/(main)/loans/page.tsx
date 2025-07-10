"use client"
import React, { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, Loader2, FileText, CreditCard, Download, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Format helpers
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
        const loansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLoans(loansData);
      } catch (error) {
        console.error("Error fetching loans:", error);
        toast({ variant: "destructive", title: "Failed to load loans", description: "Could not fetch loan data from Firestore." });
      } finally {
        setLoading(false);
      }
    };
    fetchLoans();
  }, [toast]);

  const filteredLoans = useMemo(() => {
    if (!searchTerm) return loans;
    const lower = searchTerm.toLowerCase();
    return loans.filter(loan =>
      (loan.customerName && loan.customerName.toLowerCase().includes(lower)) ||
      (loan.id && loan.id.toLowerCase().includes(lower))
    );
  }, [searchTerm, loans]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved': return <Badge variant="secondary">{status}</Badge>;
      case 'Disbursed': return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
      case 'Completed': return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
      case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  // 🧨 DELETE FUNCTION
  const handleDeleteLoan = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this loan?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "loans", id));
      setLoans(loans.filter((loan) => loan.id !== id));
      toast({ title: "Loan Deleted", description: "Loan has been removed successfully." });
    } catch (error) {
      console.error("Delete failed:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the loan." });
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
              ) : filteredLoans.length > 0 ? (
                filteredLoans.map((loan) => (
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
                    <TableCell>{getStatusBadge(loan.status)}</TableCell>
                    <TableCell className="flex flex-wrap justify-center items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/loans/${loan.id}`}>View</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => console.log("Generate Agreement")}>
                        <FileText className="mr-1 h-4 w-4" /> Agreement
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => console.log("Generate Card")}>
                        <CreditCard className="mr-1 h-4 w-4" /> Loan Card
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteLoan(loan.id)}>
                        <Trash2 className="mr-1 h-4 w-4" /> Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No loans found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )
}
