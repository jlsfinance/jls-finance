
"use client"

import React, { useEffect, useState, useCallback } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from "@/hooks/use-toast";

interface PendingEmi {
    loanId: string;
    customerId: string;
    customerName: string;
    emiNumber: number;
    dueDate: string;
    amount: number;
    tenure: number;
}

export default function DueListPage() {
    const [pendingEmis, setPendingEmis] = useState<PendingEmi[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedEmi, setSelectedEmi] = useState<PendingEmi | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const { toast } = useToast();

    const fetchPendingEmis = useCallback(async () => {
        setLoading(true);
        try {
            const loansQuery = query(collection(db, "loans"), where("status", "==", "Disbursed"));
            const loansSnapshot = await getDocs(loansQuery);
            
            const allPendingEmis: PendingEmi[] = [];

            loansSnapshot.forEach((loanDoc) => {
                const loan = loanDoc.data();
                if (loan.repaymentSchedule) {
                    loan.repaymentSchedule.forEach((emi: any) => {
                        if (emi.status === 'Pending') {
                            allPendingEmis.push({
                                loanId: loanDoc.id,
                                customerId: loan.customerId,
                                customerName: loan.customerName,
                                emiNumber: emi.emiNumber,
                                dueDate: emi.dueDate,
                                amount: emi.amount,
                                tenure: loan.tenure,
                            });
                        }
                    });
                }
            });
            
            // Sort by due date
            allPendingEmis.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            setPendingEmis(allPendingEmis);

        } catch (error) {
            console.error("Failed to load pending EMIs:", error);
            toast({
                variant: "destructive",
                title: "Load Failed",
                description: "Could not load pending EMI list.",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        fetchPendingEmis();
    }, [fetchPendingEmis]);

    const handleCollectEmi = async () => {
        if (!selectedEmi) return;
        setIsSubmitting(true);

        try {
            const loanRef = doc(db, "loans", selectedEmi.loanId);
            const loanDoc = await getDoc(loanRef);
            if (!loanDoc.exists()) throw new Error("Loan document not found!");

            const loanData = loanDoc.data();
            const updatedSchedule = loanData.repaymentSchedule.map((emi: any) => {
                if (emi.emiNumber === selectedEmi.emiNumber) {
                    return {
                        ...emi,
                        status: 'Paid',
                        paymentDate: format(new Date(), 'yyyy-MM-dd'),
                        paymentMethod: paymentMethod,
                        amountPaid: emi.amount,
                    };
                }
                return emi;
            });

            await updateDoc(loanRef, { repaymentSchedule: updatedSchedule });

            // Create receipt document
            await addDoc(collection(db, "receipts"), {
                receiptId: `RCPT-${selectedEmi.loanId}-${selectedEmi.emiNumber}`,
                loanId: selectedEmi.loanId,
                customerId: selectedEmi.customerId,
                customerName: selectedEmi.customerName,
                amount: selectedEmi.amount,
                paymentDate: format(new Date(), 'yyyy-MM-dd'),
                paymentMethod: paymentMethod,
                emiNumber: selectedEmi.emiNumber,
                createdAt: new Date(),
            });
            
            toast({ title: "✅ Success", description: `EMI #${selectedEmi.emiNumber} collected for ${selectedEmi.customerName}.` });
            
            // Refresh list
            setPendingEmis(prev => prev.filter(emi => emi.emiNumber !== selectedEmi.emiNumber || emi.loanId !== selectedEmi.loanId));
        
        } catch (error) {
            console.error("Error collecting EMI:", error);
            toast({ variant: 'destructive', title: "Collection Failed", description: "An error occurred." });
        } finally {
            setIsSubmitting(false);
            setSelectedEmi(null);
        }
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold">Pending EMI Collections</h1>
            <Card>
                <CardHeader>
                    <CardTitle>All Due EMIs</CardTitle>
                    <CardDescription>
                        {loading ? 'Loading...' : `Found ${pendingEmis.length} pending EMI(s) across all active loans.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Customer Name</TableHead>
                                <TableHead>Loan ID</TableHead>
                                <TableHead>EMI No.</TableHead>
                                <TableHead>Due Date</TableHead>
                                <TableHead>Amount (₹)</TableHead>
                                <TableHead className="text-center">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow><TableCell colSpan={6} className="text-center h-24"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
                            ) : pendingEmis.length > 0 ? (
                                pendingEmis.map((emi) => (
                                    <TableRow key={`${emi.loanId}-${emi.emiNumber}`}>
                                        <TableCell className="font-medium">{emi.customerName}</TableCell>
                                        <TableCell>{emi.loanId}</TableCell>
                                        <TableCell>{emi.emiNumber}/{emi.tenure}</TableCell>
                                        <TableCell>{emi.dueDate}</TableCell>
                                        <TableCell>₹{emi.amount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-center">
                                            <Dialog onOpenChange={(isOpen) => {
                                                if (!isOpen) {
                                                    setSelectedEmi(null);
                                                    setIsSubmitting(false);
                                                }
                                            }}>
                                                <DialogTrigger asChild>
                                                    <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => setSelectedEmi(emi)}>Collect</Button>
                                                </DialogTrigger>
                                                {selectedEmi && selectedEmi.loanId === emi.loanId && selectedEmi.emiNumber === emi.emiNumber && (
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Confirm EMI Collection</DialogTitle>
                                                            <DialogDescription>
                                                                Collecting EMI #{selectedEmi.emiNumber} of ₹{selectedEmi.amount.toLocaleString('en-IN')} for {selectedEmi.customerName}.
                                                            </DialogDescription>
                                                        </DialogHeader>
                                                        <div className="py-4 space-y-3">
                                                            <Label>Payment Method</Label>
                                                            <RadioGroup defaultValue="cash" onValueChange={setPaymentMethod}>
                                                                <div className="flex items-center space-x-2"><RadioGroupItem value="cash" id="cash" /><Label htmlFor="cash">Cash</Label></div>
                                                                <div className="flex items-center space-x-2"><RadioGroupItem value="upi" id="upi" /><Label htmlFor="upi">UPI</Label></div>
                                                                <div className="flex items-center space-x-2"><RadioGroupItem value="bank" id="bank" /><Label htmlFor="bank">Bank Transfer</Label></div>
                                                            </RadioGroup>
                                                        </div>
                                                        <DialogFooter>
                                                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                            <DialogClose asChild>
                                                                <Button onClick={handleCollectEmi} disabled={isSubmitting}>
                                                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                    Confirm Collection
                                                                </Button>
                                                            </DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                )}
                                            </Dialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="text-center h-24">🎉 No pending EMIs found! Great work!</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
