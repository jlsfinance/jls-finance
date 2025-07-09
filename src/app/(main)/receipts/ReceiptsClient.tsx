
"use client"

import React, { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import jsPDF from 'jspdf'
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from 'firebase/firestore';

import { Download, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { useToast } from "@/hooks/use-toast"

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
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(value);
  };
  
  const handleDownloadReceipt = async (receipt: Receipt) => {
    setIsDownloading(receipt.id);
    try {
        const doc = new jsPDF();
        let y = 15;

        // Fetch customer data for photo
        const customerRef = doc(db, "customers", receipt.customerId);
        const customerSnap = await getDoc(customerRef);
        
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text("JLS FINANCE LTD", 105, y, { align: 'center' });
        y += 10;
        
        if (customerSnap.exists() && customerSnap.data().photo_url) {
            try {
                // Using a CORS proxy for imgbb
                const imageUrl = `https://images.weserv.nl/?url=${encodeURIComponent(customerSnap.data().photo_url)}`;
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const reader = new FileReader();
                const imgData = await new Promise<string>((resolve, reject) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                });
                doc.addImage(imgData, 'JPEG', 165, y, 30, 30);
            } catch (e) {
                console.error("Could not add customer image to PDF:", e);
            }
        }

        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text("Payment Receipt", 105, y, { align: 'center' });
        y += 15;
        
        y = Math.max(y, 60);

        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.text(`Receipt ID: ${receipt.receiptId}`, 14, y);
        y += 7;
        doc.text(`Payment Date: ${format(new Date(receipt.paymentDate), 'PPP') || 'N/A'}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y);
        y += 10;

        doc.text(`Customer Name: ${receipt.customerName}`, 14, y);
        y += 7;
        doc.text(`Loan ID: ${receipt.loanId}`, 14, y);
        y += 8;

        doc.line(14, y, 196, y);
        y += 7;

        doc.setFont("helvetica", "bold");
        doc.text("Description", 14, y);
        doc.text("Amount", 180, y, { align: 'right' });
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.text(`EMI Payment (No. ${receipt.emiNumber})`, 14, y);
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
        
        doc.save(`Receipt_${receipt.receiptId}.pdf`);
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
