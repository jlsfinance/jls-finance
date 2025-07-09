"use client"
import { useState, useEffect } from "react"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Banknote, CalendarIcon, Loader2 } from "lucide-react"
import { addMonths, startOfMonth, format, parse, isValid } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

interface ApprovedLoan {
    id: string;
    customerName: string;
    amount: number;
    approvalDate?: string;
    tenure: number;
    emi: number;
}

export default function DisbursalPage() {
    const [approvedLoans, setApprovedLoans] = useState<ApprovedLoan[]>([])
    const [loading, setLoading] = useState(true);
    const [selectedDisbursalDate, setSelectedDisbursalDate] = useState<Date | undefined>(new Date())
    const [disbursalDateString, setDisbursalDateString] = useState<string>(format(new Date(), 'dd/MM/yyyy'));
    const { toast } = useToast()

    useEffect(() => {
        const fetchApprovedLoans = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "loans"), where("status", "==", "Approved"));
                const querySnapshot = await getDocs(q);
                const approved = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ApprovedLoan[];
                setApprovedLoans(approved);
            } catch (error) {
                console.error("Failed to load approved loans from Firestore:", error)
                toast({
                    variant: "destructive",
                    title: "Load Failed",
                    description: "Could not load approved loans for disbursal.",
                })
            } finally {
                setLoading(false);
            }
        };
        fetchApprovedLoans();
    }, [toast])
    
    useEffect(() => {
        if (selectedDisbursalDate) {
            const formattedDate = format(selectedDisbursalDate, 'dd/MM/yyyy');
            if (formattedDate !== disbursalDateString) {
                setDisbursalDateString(formattedDate);
            }
        } else {
            setDisbursalDateString("");
        }
    }, [selectedDisbursalDate, disbursalDateString]);

    const handleDisbursalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setDisbursalDateString(value);
        if (value.length >= 10) {
            const parsedDate = parse(value, 'dd/MM/yyyy', new Date());
            if (isValid(parsedDate) && parsedDate <= new Date()) {
                setSelectedDisbursalDate(parsedDate);
            } else {
                setSelectedDisbursalDate(undefined);
            }
        }
    };

    const handleDisburse = async (appId: string, loan: ApprovedLoan) => {
        if (!selectedDisbursalDate) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a valid disbursal date.",
            })
            return;
        }

        try {
            const loanRef = doc(db, "loans", appId);

            // Generate EMI schedule
            const repaymentSchedule = [];
            const firstEmiDate = startOfMonth(addMonths(selectedDisbursalDate, 1));
            for (let i = 0; i < loan.tenure; i++) {
                repaymentSchedule.push({
                    emiNumber: i + 1,
                    dueDate: format(addMonths(firstEmiDate, i), 'yyyy-MM-dd'),
                    amount: loan.emi,
                    status: 'Pending'
                });
            }
            
            await updateDoc(loanRef, {
                status: 'Disbursed',
                disbursalDate: format(selectedDisbursalDate, 'yyyy-MM-dd'),
                repaymentSchedule: repaymentSchedule
            });
            
            setApprovedLoans(prev => prev.filter(app => app.id !== appId))

            toast({
                title: `Loan Disbursed`,
                description: `The loan for ${loan.customerName} has been disbursed.`,
            })
        } catch (error) {
            console.error(`Failed to disburse loan:`, error)
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: `Could not disburse the loan.`,
            })
        }
    }

  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-headline font-semibold">Loan Disbursal Queue</h1>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Approved Loans</CardTitle>
                <CardDescription>Review and disburse approved loan applications from Firestore.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Application ID</TableHead>
                            <TableHead>Applicant Name</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Approved On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell>
                            </TableRow>
                        ) : approvedLoans.length > 0 ? approvedLoans.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell className="font-medium">{app.id}</TableCell>
                                <TableCell>{app.customerName}</TableCell>
                                <TableCell>₹{app.amount.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{app.approvalDate}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">Approved</Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Dialog onOpenChange={(isOpen) => {
                                        if (!isOpen) {
                                            const today = new Date();
                                            setSelectedDisbursalDate(today);
                                            setDisbursalDateString(format(today, 'dd/MM/yyyy'));
                                        }
                                    }}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                                <Banknote className="h-4 w-4 mr-2" />Disburse
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Disburse Loan to {app.customerName}?</DialogTitle>
                                                <DialogDescription>
                                                   Select a disbursal date. The first EMI will be due on the 1st of the following month. This cannot be undone.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-2">
                                                <Label htmlFor="disbursal-date">Disbursal Date</Label>
                                                <Popover>
                                                    <div className="relative">
                                                        <Input
                                                            id="disbursal-date"
                                                            placeholder="DD/MM/YYYY"
                                                            value={disbursalDateString}
                                                            onChange={handleDisbursalDateChange}
                                                        />
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
                                                                aria-label="Open calendar"
                                                            >
                                                                <CalendarIcon className="h-4 w-4" />
                                                            </Button>
                                                        </PopoverTrigger>
                                                    </div>
                                                    <PopoverContent className="w-auto p-0">
                                                        <Calendar
                                                            mode="single"
                                                            selected={selectedDisbursalDate}
                                                            onSelect={(date) => {
                                                                setSelectedDisbursalDate(date);
                                                                if (date) {
                                                                    setDisbursalDateString(format(date, 'dd/MM/yyyy'));
                                                                }
                                                            }}
                                                            disabled={(date) => date > new Date()}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleDisburse(app.id, app)} disabled={!selectedDisbursalDate}>Confirm Disbursal</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">No loans awaiting disbursal.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}
