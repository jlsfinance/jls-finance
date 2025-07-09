"use client"
import React, { useEffect, useState, useCallback } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Printer, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";

interface DueEmi {
    customerId: string;
    customerName: string;
    fatherName: string; // This might not be available on the loan doc directly
    mobile: string; // This will require fetching customer doc
    emiAmount: number;
    emiNumber: string;
    loanId: string;
}

export default function MonthlyDueListPage() {
    const [dueEmis, setDueEmis] = useState<DueEmi[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPrinting, setIsPrinting] = useState(false);
    const [reportMonth, setReportMonth] = useState<Date>(startOfMonth(new Date()));
    const { toast } = useToast();

    const fetchDueEmis = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch all disbursed loans
            const loansQuery = query(collection(db, "loans"), where("status", "==", "Disbursed"));
            const loansSnapshot = await getDocs(loansQuery);

            // Fetch all customers to map details later
            const customersSnapshot = await getDocs(collection(db, "customers"));
            const customersMap = new Map(customersSnapshot.docs.map(doc => [doc.id, doc.data()]));

            const dueItems: DueEmi[] = [];
            const monthStr = format(reportMonth, 'yyyy-MM');

            loansSnapshot.forEach((loanDoc) => {
                const loan = loanDoc.data();
                if (loan.repaymentSchedule) {
                    const dueEmi = loan.repaymentSchedule.find((emi: any) => 
                        emi.status === 'Pending' && 
                        emi.dueDate.startsWith(monthStr) && 
                        new Date(emi.dueDate).getDate() === 1
                    );

                    if (dueEmi) {
                        const customer = customersMap.get(loan.customerId);
                        if (customer) {
                            dueItems.push({
                                customerId: loan.customerId,
                                customerName: customer.name,
                                fatherName: customer.guarantor?.name || 'N/A', // Assuming guarantor name as father name for now
                                mobile: customer.mobile,
                                emiAmount: dueEmi.amount,
                                emiNumber: `${dueEmi.emiNumber}/${loan.tenure}`,
                                loanId: loanDoc.id,
                            });
                        }
                    }
                }
            });
            
            // Sort by customer name
            dueItems.sort((a, b) => a.customerName.localeCompare(b.customerName));
            setDueEmis(dueItems);
        } catch (error) {
            console.error("Failed to load due EMIs:", error);
            toast({
                variant: "destructive",
                title: "Load Failed",
                description: "Could not load due EMI list from Firestore.",
            });
        } finally {
            setLoading(false);
        }
    }, [reportMonth, toast]);
    
    useEffect(() => {
        fetchDueEmis();
    }, [fetchDueEmis]);

    const handlePrint = async () => {
        if (dueEmis.length === 0) return;

        setIsPrinting(true);
        try {
            const doc = new jsPDF();
            
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.text('JLS FINANCE LTD', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });

            doc.setFontSize(14);
            doc.setFont("helvetica", "normal");
            doc.text(`EMI Due List - ${format(reportMonth, 'MMMM yyyy')}`, doc.internal.pageSize.getWidth() / 2, 25, { align: 'center' });
            
            doc.setFontSize(10);
            doc.text(`Report Date: ${format(new Date(), 'PPP')}`, 15, 35);

            const tableColumn = ["Sr. No.", "Customer Name", "Spouse/Father Name", "Mobile Number", "EMI Amount (₹)", "EMI No.", "Loan ID", "Remarks"];
            const tableRows: (string | number)[][] = [];

            dueEmis.forEach((emi, index) => {
                const emiData = [
                    index + 1,
                    emi.customerName,
                    emi.fatherName,
                    emi.mobile,
                    `₹${emi.emiAmount.toLocaleString('en-IN')}`,
                    emi.emiNumber,
                    emi.loanId,
                    ''
                ];
                tableRows.push(emiData);
            });

            autoTable(doc, {
                head: [tableColumn],
                body: tableRows,
                startY: 45,
                theme: 'grid',
                headStyles: { fillColor: [46, 154, 254] },
                styles: { font: "helvetica", fontSize: 9 },
            });
            
            doc.save(`Due_EMIs_${format(reportMonth, 'yyyy-MM')}.pdf`);
            toast({ title: "Download Successful", description: "Due EMI List PDF downloaded successfully!" });

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            toast({ variant: "destructive", title: "Download Failed", description: "Could not generate the PDF." });
        } finally {
            setIsPrinting(false);
        }
    };
    
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-headline font-semibold">Monthly EMI Due List</h1>
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => setReportMonth(subMonths(reportMonth, 1))}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <p className="text-muted-foreground font-medium text-lg w-36 text-center">{format(reportMonth, 'MMMM yyyy')}</p>
                        <Button variant="outline" size="icon" onClick={() => setReportMonth(addMonths(reportMonth, 1))}>
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
                <Button onClick={handlePrint} disabled={isPrinting || dueEmis.length === 0} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
                    Print / Download PDF
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Dues for {format(reportMonth, 'MMMM yyyy')}</CardTitle>
                    <CardDescription>
                        {loading ? 'Loading...' : `${dueEmis.length} EMI(s) due on the 1st of ${format(reportMonth, 'MMMM')}.`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div id="printable-due-list">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]">Sr. No.</TableHead>
                                    <TableHead>Customer Name</TableHead>
                                    <TableHead>Spouse/Father Name</TableHead>
                                    <TableHead>Mobile Number</TableHead>
                                    <TableHead>EMI Amount (₹)</TableHead>
                                    <TableHead>EMI No.</TableHead>
                                    <TableHead>Loan ID</TableHead>
                                    <TableHead>Remarks</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={8} className="text-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></TableCell></TableRow>
                                ) : dueEmis.length > 0 ? (
                                    dueEmis.map((emi, index) => (
                                        <TableRow key={`${emi.loanId}-${emi.emiNumber}`}>
                                            <TableCell className="font-medium text-center">{index + 1}</TableCell>
                                            <TableCell>{emi.customerName}</TableCell>
                                            <TableCell>{emi.fatherName}</TableCell>
                                            <TableCell>
                                                <a href={`tel:${emi.mobile}`} className="text-primary hover:underline">{emi.mobile}</a>
                                            </TableCell>
                                            <TableCell>₹{emi.emiAmount.toLocaleString('en-IN')}</TableCell>
                                            <TableCell>{emi.emiNumber}</TableCell>
                                            <TableCell>{emi.loanId}</TableCell>
                                            <TableCell></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={8} className="text-center h-24">No EMIs are due for this month.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
