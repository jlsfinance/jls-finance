
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { format, parseISO } from 'date-fns'
import jsPDF from 'jspdf'
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';

import { Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useToast } from "@/hooks/use-toast"
import { JLS_LOGO_DATA_URL } from '@/lib/logo';

interface Receipt {
    id: string;
    loanId: string;
    customerId: string;
    customerName: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    receiptId: string;
    emiNumber: number;
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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(value);
  };
  
  const handleDownloadReceipt = async (receipt: Receipt) => {
    setIsDownloading(receipt.id);
    try {
        if (!receipt || !receipt.customerId || !receipt.receiptId) {
            toast({
                variant: "destructive",
                title: "Data Missing",
                description: "Cannot generate receipt due to incomplete data.",
            });
            setIsDownloading(null);
            return;
        }

        const pdfDoc = new jsPDF();
        
        const customerRef = doc(db, "customers", receipt.customerId);
        const customerSnap = await getDoc(customerRef);
        
        let y = 15;
        const leftMargin = 14;

        if (JLS_LOGO_DATA_URL) {
            pdfDoc.addImage(JLS_LOGO_DATA_URL, 'PNG', leftMargin, 15, 10, 10);
            pdfDoc.setFont("helvetica", "bold");
            pdfDoc.setFontSize(14);
            pdfDoc.text("JLS Finance Company", leftMargin + 12, 22);
        }
        
        if (customerSnap.exists() && customerSnap.data().photo_url) {
            try {
                const imageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(customerSnap.data().photo_url)}`;
                const response = await fetch(imageUrl);
                if (!response.ok) throw new Error(`Image fetch failed: ${response.statusText}`);
                const blob = await response.blob();
                const reader = new FileReader();
                const imgData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(blob);
                });
                pdfDoc.addImage(imgData, 165, y - 5, 30, 30);
            } catch (e) {
                console.error("Could not add customer image to PDF:", e);
            }
        }

        y=35;
        pdfDoc.setFontSize(14);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text("Payment Receipt", 105, y, { align: 'center' });
        y += 15;
        
        y = Math.max(y, 60);

        pdfDoc.setFontSize(11);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`Receipt ID: ${receipt.receiptId}`, 14, y);
        y += 7;

        let formattedDate = 'N/A';
        try {
            formattedDate = format(parseISO(receipt.paymentDate), 'PPP');
        } catch (e) {
            console.error("Invalid date format for receipt:", receipt.paymentDate);
        }
        pdfDoc.text(`Payment Date: ${formattedDate}`, 14, y);
        y += 8;

        pdfDoc.line(14, y, 196, y);
        y += 10;

        pdfDoc.text(`Customer Name: ${receipt.customerName}`, 14, y);
        y += 7;
        pdfDoc.text(`Loan ID: ${receipt.loanId}`, 14, y);
        y += 8;

        pdfDoc.line(14, y, 196, y);
        y += 7;

        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Description", 14, y);
        pdfDoc.text("Amount", 180, y, { align: 'right' });
        y += 8;
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.text(`EMI Payment (No. ${receipt.emiNumber || 'N/A'})`, 14, y);
        pdfDoc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 10;

        pdfDoc.line(14, y, 196, y);
        
        y += 7;
        pdfDoc.setFont("helvetica", "bold");
        pdfDoc.text("Total Paid:", 130, y);
        pdfDoc.text(formatCurrency(receipt.amount), 180, y, { align: 'right' });
        y += 13;

        pdfDoc.text(`Payment Method: ${(receipt.paymentMethod || 'N/A').toUpperCase()}`, 14, y);

        pdfDoc.setFontSize(10);
        pdfDoc.text("This is a computer-generated receipt and does not require a signature.", 105, 280, { align: 'center' });
        
        pdfDoc.save(`Receipt_${receipt.receiptId}.pdf`);
        toast({ title: "✅ Success!", description: "Receipt has been downloaded." });
    } catch (error: any) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: error.message || "Could not generate the PDF receipt."
        });
    } finally {
        setIsDownloading(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Payment Receipts</h1>
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
                  <TableCell>{receipt.loanId.slice(0, 8)}...</TableCell>
                  <TableCell>₹{receipt.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{format(parseISO(receipt.paymentDate), 'dd MMM, yyyy')}</TableCell>
                  <TableCell>{receipt.paymentMethod.toUpperCase()}</TableCell>
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
