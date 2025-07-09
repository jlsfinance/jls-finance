"use client"

import { useState, useMemo } from 'react';
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc, getDoc, writeBatch } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Loan {
  id: string;
  customerName: string;
  repaymentSchedule: Emi[];
  [key: string]: any;
}

interface Emi {
  emiNumber: number;
  dueDate: string;
  amount: number;
  status: 'Paid' | 'Pending';
}

export default function NewEMICollectionPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Loan[]>([]);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [selectedEmi, setSelectedEmi] = useState<Emi | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  const pendingEmis = useMemo(() => {
    return selectedLoan?.repaymentSchedule.filter(emi => emi.status === 'Pending') || [];
  }, [selectedLoan]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm) return;
    setLoading(true);
    setSelectedLoan(null);

    try {
      // Search by Loan ID
      let loans: Loan[] = [];
      const loanRef = doc(db, "loans", searchTerm);
      const loanSnap = await getDoc(loanRef);
      if (loanSnap.exists()) {
        loans.push({ id: loanSnap.id, ...loanSnap.data() } as Loan);
      } else {
        // Search by Customer Name
        const q = query(collection(db, "loans"), where("customerName", "==", searchTerm), where("status", "==", "Disbursed"));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          loans.push({ id: doc.id, ...doc.data() } as Loan);
        });
      }

      setSearchResults(loans.filter(l => l.status === 'Disbursed'));
      if (loans.length === 0) {
        toast({ variant: 'destructive', title: "Not Found", description: "No active loans found for that search term." });
      }
    } catch (error) {
      console.error("Error searching loans:", error);
      toast({ variant: 'destructive', title: "Search Failed", description: "An error occurred while searching for loans." });
    } finally {
      setLoading(false);
    }
  };

  const handleCollectEmi = async () => {
    if (!selectedLoan || !selectedEmi) return;
    setIsSubmitting(true);

    try {
      const loanRef = doc(db, "loans", selectedLoan.id);
      
      const updatedSchedule = selectedLoan.repaymentSchedule.map(emi => {
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

      // Save a separate receipt document for easier querying
      const receiptRef = collection(db, "receipts");
      await addDoc(receiptRef, {
         receiptId: `RCPT-${selectedLoan.id}-${selectedEmi.emiNumber}`,
         loanId: selectedLoan.id,
         customerId: selectedLoan.customerId,
         customerName: selectedLoan.customerName,
         amount: selectedEmi.amount,
         paymentDate: format(new Date(), 'yyyy-MM-dd'),
         paymentMethod: paymentMethod,
         emiNumber: selectedEmi.emiNumber,
         createdAt: new Date(),
      });
      
      toast({ title: "✅ Success", description: `EMI #${selectedEmi.emiNumber} collected successfully.` });
      setSelectedLoan(null);
      setSearchTerm('');
      setSearchResults([]);
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
      <h1 className="text-2xl font-headline font-semibold">EMI Collection</h1>
      
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Find Loan</CardTitle>
          <CardDescription>Search by Loan ID or exact Customer Name to find an active loan.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input 
              placeholder="Loan ID or Customer Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" disabled={loading || !searchTerm}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </form>
        </CardContent>
      </Card>

      {searchResults.length > 0 && !selectedLoan && (
        <Card className="max-w-3xl mx-auto">
            <CardHeader><CardTitle>Search Results</CardTitle></CardHeader>
            <CardContent>
                <div className="space-y-2">
                    {searchResults.map(loan => (
                        <div key={loan.id} className="flex justify-between items-center p-3 border rounded-md">
                            <div>
                                <p className="font-semibold">{loan.customerName}</p>
                                <p className="text-sm text-muted-foreground">Loan ID: {loan.id}</p>
                            </div>
                            <Button onClick={() => setSelectedLoan(loan)}>Select</Button>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
      )}

      {selectedLoan && (
         <Card className="max-w-3xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Collect EMI for {selectedLoan.customerName}</CardTitle>
                        <CardDescription>Loan ID: {selectedLoan.id}</CardDescription>
                    </div>
                     <Button variant="link" onClick={() => { setSelectedLoan(null); setSearchResults([]) }}>Change Loan</Button>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>EMI No.</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {pendingEmis.length > 0 ? (
                            pendingEmis.map((emi) => (
                                <TableRow key={emi.emiNumber}>
                                    <TableCell>{emi.emiNumber}</TableCell>
                                    <TableCell>{emi.dueDate}</TableCell>
                                    <TableCell>₹{emi.amount.toLocaleString('en-IN')}</TableCell>
                                    <TableCell><Badge variant="outline">{emi.status}</Badge></TableCell>
                                    <TableCell className="text-right">
                                        <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedEmi(null)}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-accent text-accent-foreground" onClick={() => setSelectedEmi(emi)}>Collect</Button>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Confirm EMI Collection</DialogTitle>
                                                    <DialogDescription>
                                                        You are collecting EMI #{emi.emiNumber} of ₹{emi.amount.toLocaleString('en-IN')} for {selectedLoan.customerName}.
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
                                                    <Button onClick={handleCollectEmi} disabled={isSubmitting}>
                                                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                        Confirm Collection
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </TableCell>
                                </TableRow>
                            ))
                       ) : (
                           <TableRow>
                               <TableCell colSpan={5} className="text-center h-24">All EMIs have been paid for this loan.</TableCell>
                           </TableRow>
                       )}
                    </TableBody>
                </Table>
            </CardContent>
         </Card>
      )}
    </div>
  )
}
