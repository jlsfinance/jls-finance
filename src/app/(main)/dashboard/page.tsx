
"use client"
import { useEffect, useState } from "react"
import Link from 'next/link'
import { collection, getDocs, query, where, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/hooks/use-toast"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Users, FileText, CheckCircle, Loader2, ArrowRight } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { format, subMonths } from 'date-fns'

// Admin/Agent Dashboard Components
const chartConfig = {
  applications: {
    label: "Applications",
    color: "hsl(var(--primary))",
  },
  approved: {
    label: "Approved",
    color: "hsl(var(--accent))",
  },
}

interface Stats {
    totalDisbursed: number;
    activeLoans: number;
    totalCustomers: number;
    totalCollectionsToday: number;
}
interface Loan {
    id: string;
    customerName: string;
    amount: number;
    status: string;
    date: string;
}

function AdminDashboard() {
    const [stats, setStats] = useState<Stats>({
        totalDisbursed: 0,
        activeLoans: 0,
        totalCustomers: 0,
        totalCollectionsToday: 0
    });
    const [recentApplications, setRecentApplications] = useState<Loan[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch Customers
                const customersSnapshot = await getDocs(collection(db, "customers"));
                const totalCustomers = customersSnapshot.size;

                // Fetch Loans
                const loansSnapshot = await getDocs(collection(db, "loans"));
                const loansData = loansSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
                
                const totalDisbursed = loansData
                    .filter(loan => loan.status === 'Disbursed')
                    .reduce((sum, loan) => sum + loan.amount, 0);

                const activeLoans = loansData.filter(loan => loan.status === 'Disbursed').length;

                // Recent applications
                const sortedLoans = loansData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setRecentApplications(sortedLoans.slice(0, 5));

                // Chart Data (last 6 months)
                const monthlyData: { [key: string]: { applications: number; approved: number } } = {};
                const now = new Date();

                for (let i = 5; i >= 0; i--) {
                    const d = subMonths(now, i);
                    const monthKey = format(d, 'yyyy-MM');
                    monthlyData[monthKey] = { applications: 0, approved: 0 };
                }

                loansData.forEach(loan => {
                    const loanDate = new Date(loan.date);
                    const monthKey = format(loanDate, 'yyyy-MM');
                    if (monthlyData[monthKey]) {
                        monthlyData[monthKey].applications++;
                        if (loan.status === 'Approved' || loan.status === 'Disbursed' || loan.status === 'Completed') {
                            monthlyData[monthKey].approved++;
                        }
                    }
                });

                const finalChartData = Object.entries(monthlyData).map(([month, data]) => ({
                    month: format(new Date(month), 'MMM'),
                    ...data
                }));
                setChartData(finalChartData);

                // For simplicity, total collections today is mocked.
                const totalCollectionsToday = Math.floor(Math.random() * 200000);

                setStats({ totalDisbursed, activeLoans, totalCustomers, totalCollectionsToday });

            } catch (error) {
                console.error("Error fetching dashboard data: ", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN')}`;

    if (loading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin" /></div>
    }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalDisbursed)}</div>
            <p className="text-xs text-muted-foreground">Across all active loans</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Loans</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.activeLoans.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Currently being repaid</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{stats.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Registered in the system</p>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collections Today</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCollectionsToday)}</div>
            <p className="text-xs text-muted-foreground">(Mock data)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Loan Applications Overview</CardTitle>
            <CardDescription>Last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8}/>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="applications" fill="var(--color-applications)" radius={4} />
                    <Bar dataKey="approved" fill="var(--color-approved)" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Recent Loan Applications</CardTitle>
            <CardDescription>A quick look at the most recent loan activities.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentApplications.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.customerName}</TableCell>
                    <TableCell>{formatCurrency(app.amount)}</TableCell>
                    <TableCell>{app.date}</TableCell>
                    <TableCell>
                      <Badge variant={
                        app.status === "Approved" || app.status === "Disbursed" ? "default" : app.status === "Pending" ? "secondary" : "destructive"
                      } className={
                        (app.status === "Approved" || app.status === "Disbursed") ? "bg-accent text-accent-foreground" : ""
                      }>
                        {app.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CustomerLoanInfo({ userId }: { userId: string }) {
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    useEffect(() => {
        if (!userId) return;
        const fetchLoans = async () => {
            setLoading(true);
            try {
                const q = query(collection(db, "loans"), where("customerId", "==", userId), orderBy("date", "desc"));
                const querySnapshot = await getDocs(q);
                const loansData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setLoans(loansData);
            } catch (error) {
                console.error("Error fetching customer loans:", error);
                toast({
                    variant: "destructive",
                    title: "Failed to load your loan data.",
                });
            } finally {
                setLoading(false);
            }
        };
        fetchLoans();
    }, [userId, toast]);

    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Your Loan Status</CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center items-center h-24">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    if (loans.length === 0) {
        return null; // Don't show the card if there are no loans
    }
    
    const getStatusBadge = (status: string) => {
      switch (status) {
          case 'Approved': return <Badge variant="secondary">{status}</Badge>;
          case 'Disbursed': return <Badge className="bg-blue-500 text-white hover:bg-blue-500/90">Active</Badge>;
          case 'Completed': return <Badge className="bg-accent text-accent-foreground">{status}</Badge>;
          case 'Rejected': return <Badge variant="destructive">{status}</Badge>;
          default: return <Badge variant="outline">{status}</Badge>;
      }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Your Loan Applications</CardTitle>
                <CardDescription>Here is a summary of your loan applications with us.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Loan ID</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loans.map(loan => (
                            <TableRow key={loan.id}>
                                <TableCell className="font-medium">{loan.id.slice(0, 8)}...</TableCell>
                                <TableCell>₹{loan.amount.toLocaleString('en-IN')}</TableCell>
                                <TableCell>{getStatusBadge(loan.status)}</TableCell>
                                <TableCell className="text-right">
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/loans/${loan.id}`}>View Details</Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function CustomerDashboard({ user }: { user: any }) {
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-headline font-semibold">Welcome back, {user.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">Here's your personal financial dashboard.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle>Apply for a New Loan</CardTitle>
                        <CardDescription>Need funds? Get a quick and easy loan from us.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button asChild size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
                            <Link href="/loans/new">
                                Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card className="flex flex-col justify-between">
                    <CardHeader>
                        <CardTitle>EMI Calculator</CardTitle>
                        <CardDescription>Plan your finances. Calculate your monthly loan payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button asChild size="lg" variant="secondary" className="w-full">
                            <Link href="/emi-calculator">
                                Calculate EMI <ArrowRight className="ml-2 h-4 w-4" />
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <CustomerLoanInfo userId={user.uid} />
        </div>
    );
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    
    if (loading || !user) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin" /></div>
    }

    if (user.role === 'customer') {
        return <CustomerDashboard user={user} />;
    }

    // Admin or Agent view
    return <AdminDashboard />;
}
