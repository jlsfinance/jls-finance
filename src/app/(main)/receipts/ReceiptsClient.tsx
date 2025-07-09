"use client"

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { db } from "@/lib/firebase";
import { collection, getDocs, addDoc, query, orderBy } from 'firebase/firestore';

import { PlusCircle, Download, CalendarIcon, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

interface Receipt {
    id: string;
    loanId: string;
    customerName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receiptId: string;
}

export default function ReceiptsClient() {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
        const q = query(collection(db, "receipts"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const receiptsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Receipt[];
        setReceipts(receiptsData);
    } catch (error) {
        console.error("Failed to load receipts:", error);
        toast({ variant: "destructive", title: "Load Failed", description: "Could not load receipts from Firestore." });
    } finally {
        setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);


  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(value);
  };
  
  const handleDownloadReceipt = (receipt: Receipt) => {
    setIsDownloading(receipt.id);
    try {
        const doc = new jsPDF();
        let y = 15;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JLS FINANCE LTD", 105, y, { align: 'center' });
        y += 10;

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Payment Receipt", 105, y, { align: 'center' });
        y += 15;

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Receipt ID: ${receipt.receiptId}`, 14, y);
        y += 7;
        doc.text(`Payment Date: ${format(new Date(receipt.paymentDate), 'PPP') || 'N/A'}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y); // separator
        y += 10;

        doc.text(`Customer Name: ${receipt.customerName}`, 14, y);
        y += 7;
        doc.text(`Loan ID: ${receipt.loanId}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y); // separator
        y += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Description", 14, y);
        doc.text("Amount", 180, y, { align: 'right' });
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.text(`Payment Received`, 14, y);
        doc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 10;

        doc.line(14, y, 196, y);
        
        y += 7;
        doc.setFont("helvetica", "bold");
        doc.text("Total Paid:", 130, y);
        doc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 13;

        doc.text(`Payment Method: ${receipt.paymentMethod || 'N/A'}`, 14, y);

        doc.setFontSize(10);
        doc.text("This is a computer-generated receipt and does not require a signature.", 105, 280, { align: 'center' });
        
        doc.save(`Receipt_${receipt.id}.pdf`);
        toast({ title: "Receipt Downloaded!" });
    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not generate the PDF receipt."
        });
    } finally {
        setIsDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Payment Receipts</h1>
        {/* The "Add Receipt" button is now part of the EMI Collection flow */}
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>All Receipts</CardTitle>
          <CardDescription>View and download payment receipts from Firestore.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Loan ID</TableHead>
                <TableHead>Amount (₹)</TableHead>
                <TableHead>Payment Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                  </TableCell>
                </TableRow>
              ) : receipts.length > 0 ? receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell className="font-medium">{receipt.receiptId}</TableCell>
                  <TableCell>{receipt.customerName}</TableCell>
                  <TableCell>{receipt.loanId}</TableCell>
                  <TableCell>₹{receipt.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{receipt.paymentDate}</TableCell>
                  <TableCell>{receipt.paymentMethod}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(receipt)} disabled={isDownloading === receipt.id}>
                      {isDownloading === receipt.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="mr-2 h-4 w-4" />
                      )}
                      Download
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    No receipts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
