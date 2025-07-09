
"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, addDoc, getDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2 } from 'lucide-react';
import { format, parseISO, isPast } from 'date-fns';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
    const [months, setMonths] = useState<string[]>([]);
    const [selectedMonth, setSelectedMonth] = useState('All');
    const [loading, setLoading] = useState(true);
    const [selectedEmi, setSelectedEmi] = useState<PendingEmi | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const { toast } = useToast();

    const fetchPendingEmis = async () => {
        setLoading(true);
        try {
            const loansQuery = query(collection(db, "loans"), where("status", "==", "Disbursed"));
            const loansSnapshot = await getDocs(loansQuery);
            
            const pendingEmisList: PendingEmi[] = [];
            const uniqueMonths = new Set<string>();

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
                            uniqueMonths.add(format(parseISO(emi.dueDate), 'yyyy-MM'));
                        }
                    });
                }
            }
            
            pendingEmisList.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            setAllPendingEmis(pendingEmisList);
            setFilteredEmis(pendingEmisList);

            const sortedMonths = Array.from(uniqueMonths).sort();
            setMonths(sortedMonths);
            
            const currentMonthKey = format(new Date(), 'yyyy-MM');
            if (sortedMonths.includes(currentMonthKey)) {
                setSelectedMonth(currentMonthKey);
            } else {
                setSelectedMonth('All');
            }

        } catch (error) {
            console.error("Failed to load pending EMIs:", error);
            toast({ variant: "destructive", title: "Load Failed", description: "Could not load pending EMI list." });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchPendingEmis();
    }, []);

    useEffect(() => {
        if (selectedMonth === 'All') {
            setFilteredEmis(allPendingEmis);
        } else {
            setFilteredEmis(allPendingEmis.filter(emi => format(parseISO(emi.dueDate), 'yyyy-MM') === selectedMonth));
        }
    }, [selectedMonth, allPendingEmis]);

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
    
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold">Pending EMI Collections</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Due EMIs</CardTitle>
                    <CardDescription>
                        {loading ? 'Loading...' : `Found ${allPendingEmis.length} total pending EMI(s).`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs value={selectedMonth} onValueChange={setSelectedMonth}>
                        <TabsList>
                            <TabsTrigger value="All">All</TabsTrigger>
                            {months.map(month => (
                                <TabsTrigger key={month} value={month}>{format(parseISO(`${month}-01`), 'MMMM yyyy')}</TabsTrigger>
                            ))}
                        </TabsList>
                        <div className="mt-4">
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
                                        <TableRow><TableCell colSpan={6} className="text-center h-24">🎉 No pending EMIs found for this period!</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
