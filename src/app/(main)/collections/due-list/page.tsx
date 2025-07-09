
"use client"

import React, { useEffect, useState } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, isPast, subMonths, addMonths } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';

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
    const [allPendingEmis, setAllPendingEmis] = useState<PendingEmi[]>([]);
    const [filteredEmis, setFilteredEmis] = useState<PendingEmi[]>([]);
    const [viewDate, setViewDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedEmi, setSelectedEmi] = useState<PendingEmi | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const { toast } = useToast();

    useEffect(() => {
        const fetchPendingEmis = async () => {
            setLoading(true);
            try {
                const loansQuery = query(collection(db, "loans"), where("status", "==", "Disbursed"));
                const loansSnapshot = await getDocs(loansQuery);
                
                const pendingEmisList: PendingEmi[] = [];

                for (const loanDoc of loansSnapshot.docs) {
                    const loan = loanDoc.data();
                    if (loan.repaymentSchedule) {
                        loan.repaymentSchedule.forEach((emi: any) => {
                            if (emi.status === 'Pending') {
                                pendingEmisList.push({
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
                }
                
                pendingEmisList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
                setAllPendingEmis(pendingEmisList);

            } catch (error) {
                console.error("Failed to load pending EMIs:", error);
                toast({ variant: "destructive", title: "Load Failed", description: "Could not load pending EMI list." });
            } finally {
                setLoading(false);
            }
        };
        
        fetchPendingEmis();
    }, [toast]);

    useEffect(() => {
        const monthKey = format(viewDate, 'yyyy-MM');
        setFilteredEmis(allPendingEmis.filter(emi => format(parseISO(emi.dueDate), 'yyyy-MM') === monthKey));
    }, [viewDate, allPendingEmis]);

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
                    return { ...emi, status: 'Paid', paymentDate: format(new Date(), 'yyyy-MM-dd'), paymentMethod: paymentMethod, amountPaid: emi.amount };
                }
                return emi;
            });

            await updateDoc(loanRef, { repaymentSchedule: updatedSchedule });

            await addDoc(collection(db, "receipts"), {
                receiptId: `RCPT-${Date.now()}`,
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
            
            setAllPendingEmis(prev => prev.filter(emi => !(emi.emiNumber === selectedEmi.emiNumber && emi.loanId === selectedEmi.loanId)));
        
        } catch (error) {
            console.error("Error collecting EMI:", error);
            toast({ variant: 'destructive', title: "Collection Failed", description: "An error occurred." });
        } finally {
            setIsSubmitting(false);
            setSelectedEmi(null);
        }
    };

    const goToPreviousMonth = () => setViewDate(prev => subMonths(prev, 1));
    const goToNextMonth = () => setViewDate(prev => addMonths(prev, 1));
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold">Monthly EMI Collections</h1>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Due EMIs for {format(viewDate, 'MMMM yyyy')}</CardTitle>
                         <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" onClick={goToNextMonth}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                    <CardDescription>
                        {loading ? 'Loading...' : `Found ${filteredEmis.length} pending EMI(s) for this period.`}
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
                            ) : filteredEmis.length > 0 ? (
                                filteredEmis.map((emi) => (
                                    <TableRow key={`${emi.loanId}-${emi.emiNumber}`}>
                                        <TableCell className="font-medium">{emi.customerName}</TableCell>
                                        <TableCell>{emi.loanId.slice(0,8)}...</TableCell>
                                        <TableCell>{emi.emiNumber}/{emi.tenure}</TableCell>
                                        <TableCell>
                                            {isPast(parseISO(emi.dueDate)) ? (
                                                <Badge variant="destructive">{format(parseISO(emi.dueDate), 'dd MMM, yyyy')}</Badge>
                                            ) : (
                                                format(parseISO(emi.dueDate), 'dd MMM, yyyy')
                                            )}
                                        </TableCell>
                                        <TableCell>₹{emi.amount.toLocaleString('en-IN')}</TableCell>
                                        <TableCell className="text-center">
                                            <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedEmi(null)}>
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
                                <TableRow><TableCell colSpan={6} className="text-center h-24">🎉 No pending EMIs found for {format(viewDate, 'MMMM yyyy')}.</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
