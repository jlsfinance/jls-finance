"use client"
import { useState, useEffect } from "react"
import { collection, getDocs, query, where, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Check, X, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface LoanApplication {
    id: string;
    customerName: string;
    amount: number;
    date: string;
    status: string;
}

export default function ApprovalsPage() {
    const [applications, setApplications] = useState<LoanApplication[]>([])
    const [loading, setLoading] = useState(true);
    const [comment, setComment] = useState('')
    const { toast } = useToast()

    const fetchPendingApplications = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "loans"), where("status", "==", "Pending"));
            const querySnapshot = await getDocs(q);
            const pendingApps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as LoanApplication[];
            setApplications(pendingApps);
        } catch (error) {
            console.error("Failed to load loan applications from Firestore:", error)
            toast({
                variant: "destructive",
                title: "Load Failed",
                description: "Could not load loan applications.",
            })
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        fetchPendingApplications();
    }, []);

    const handleStatusUpdate = async (appId: string, newStatus: 'Approved' | 'Rejected') => {
        try {
            const loanRef = doc(db, "loans", appId);
            
            const updateData: any = {
                status: newStatus,
                comment: comment,
            };

            if (newStatus === 'Approved') {
                updateData.approvalDate = new Date().toISOString().split('T')[0];
            }

            await updateDoc(loanRef, updateData);
            
            setApplications(prev => prev.filter(app => app.id !== appId))
            setComment('') // Reset comment

            toast({
                title: `Application ${newStatus}`,
                description: `The loan application has been successfully ${newStatus.toLowerCase()}.`,
            })
        } catch (error) {
            console.error(`Failed to ${newStatus.toLowerCase()} application:`, error)
             toast({
                variant: "destructive",
                title: "Update Failed",
                description: `Could not update the application status.`,
            })
        }
    }


  return (
    <div className="space-y-6">
        <h1 className="text-2xl font-headline font-semibold">Loan Approval Queue</h1>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Pending Applications</CardTitle>
                <CardDescription>Review and process new loan applications from Firestore.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Application ID</TableHead>
                            <TableHead>Applicant Name</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Submitted On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24"><Loader2 className="mx-auto h-8 w-8 animate-spin" /></TableCell>
                            </TableRow>
                        ) : applications.length > 0 ? applications.map((app) => (
                            <TableRow key={app.id}>
                                <TableCell className="font-medium">{app.id}</TableCell>
                                <TableCell>{app.customerName}</TableCell>
                                <TableCell>₹{app.amount.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{app.date}</TableCell>
                                <TableCell>
                                    <Badge variant="secondary">{app.status}</Badge>
                                </TableCell>
                                <TableCell className="flex justify-center gap-2">
                                    <Dialog onOpenChange={() => setComment('')}>
                                        <DialogTrigger asChild>
                                            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                                <Check className="h-4 w-4 mr-2" />Approve
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Approve Loan for {app.customerName}?</DialogTitle>
                                                <DialogDescription>
                                                    You are about to approve a loan of ₹{app.amount.toLocaleString('en-IN')}. Please add any final comments.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Label htmlFor={`comments-approve-${app.id}`}>Comments (Optional)</Label>
                                                <Textarea id={`comments-approve-${app.id}`} placeholder="e.g., All documents verified." value={comment} onChange={(e) => setComment(e.target.value)} />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                    <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleStatusUpdate(app.id, 'Approved')}>Confirm Approval</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Dialog onOpenChange={() => setComment('')}>
                                        <DialogTrigger asChild>
                                            <Button variant="destructive" size="sm">
                                                <X className="h-4 w-4 mr-2" />Reject
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Reject Loan for {app.customerName}?</DialogTitle>
                                                <DialogDescription>
                                                    You are about to reject a loan of ₹{app.amount.toLocaleString('en-IN')}. Please provide a reason for rejection.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4">
                                                <Label htmlFor={`comments-reject-${app.id}`}>Rejection Reason</Label>
                                                <Textarea id={`comments-reject-${app.id}`} placeholder="e.g., Insufficient income proof." value={comment} onChange={(e) => setComment(e.target.value)} />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button variant="outline">Cancel</Button>
                                                </DialogClose>
                                                <DialogClose asChild>
                                                    <Button variant="destructive" onClick={() => handleStatusUpdate(app.id, 'Rejected')}>Confirm Rejection</Button>
                                                </DialogClose>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">No pending applications found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}
