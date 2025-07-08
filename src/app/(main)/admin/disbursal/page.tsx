"use client"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Banknote, CalendarIcon } from "lucide-react"
import { addMonths, startOfMonth, format, parse, isValid } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

export default function DisbursalPage() {
    const [approvedLoans, setApprovedLoans] = useState<any[]>([])
    const [selectedDisbursalDate, setSelectedDisbursalDate] = useState<Date | undefined>(new Date())
    const [disbursalDateString, setDisbursalDateString] = useState<string>(format(new Date(), 'dd/MM/yyyy'));
    const { toast } = useToast()

    useEffect(() => {
        try {
            const storedApplications = localStorage.getItem('loanApplications')
            if (storedApplications) {
                const allApps = JSON.parse(storedApplications)
                const pendingDisbursal = allApps.filter((app: any) => app.status === 'Approved')
                setApprovedLoans(pendingDisbursal)
            }
        } catch (error) {
            console.error("Failed to load approved loans from localStorage:", error)
            toast({
                variant: "destructive",
                title: "Load Failed",
                description: "Could not load approved loans for disbursal.",
            })
        }
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
    }, [selectedDisbursalDate]);

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

    const handleDisburse = (appId: string) => {
        if (!selectedDisbursalDate) {
            toast({
                variant: "destructive",
                title: "Validation Error",
                description: "Please select a valid disbursal date.",
            })
            return;
        }

        try {
            const storedApplications = localStorage.getItem('loanApplications')
            if (!storedApplications) return

            let allApps = JSON.parse(storedApplications)
            
            const appIndex = allApps.findIndex((app: any) => app.id === appId)
            if (appIndex === -1) return

            const loan = allApps[appIndex];
            
            loan.status = 'Disbursed'
            loan.disbursalDate = format(selectedDisbursalDate, 'yyyy-MM-dd')

            // Generate EMI schedule based on the selected disbursal date
            const repaymentSchedule = [];
            const firstEmiDate = startOfMonth(addMonths(selectedDisbursalDate, 1));
            for (let i = 0; i < loan.tenure; i++) {
                repaymentSchedule.push({
                    emiNumber: i + 1,
                    dueDate: format(addMonths(firstEmiDate, i), 'yyyy-MM-dd'),
                    amount: loan.emi,
                    status: 'Pending' // EMI payment status
                });
            }
            loan.repaymentSchedule = repaymentSchedule;
            
            allApps[appIndex] = loan;


            localStorage.setItem('loanApplications', JSON.stringify(allApps))
            
            setApprovedLoans(prev => prev.filter(app => app.id !== appId))

            toast({
                title: `Loan Disbursed`,
                description: `The loan ${appId} has been successfully disbursed and EMI schedule generated.`,
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
                <CardDescription>Review and disburse approved loan applications.</CardDescription>
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
                        {approvedLoans.length > 0 ? approvedLoans.map((app) => (
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
                                                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleDisburse(app.id)} disabled={!selectedDisbursalDate}>Confirm Disbursal</Button>
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
