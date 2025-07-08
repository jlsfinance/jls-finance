"use client"
import React from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon, FileDown } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const reportData = [
  { loanId: 'LN001', customer: 'John Doe', amount: 2500, date: '2023-11-01', agent: 'Agent A' },
  { loanId: 'LN002', customer: 'Jane Smith', amount: 5000, date: '2023-11-01', agent: 'Agent B' },
  { loanId: 'LN003', customer: 'Sam Wilson', amount: 1200, date: '2023-11-02', agent: 'Agent A' },
  { loanId: 'LN004', customer: 'Alice Brown', amount: 10000, date: '2023-11-02', agent: 'Agent C' },
  { loanId: 'LN005', customer: 'Bob Johnson', amount: 3500, date: '2023-11-03', agent: 'Agent B' },
];

export default function ReportsPage() {
    const [date, setDate] = React.useState<DateRange | undefined>({
        from: new Date(2023, 10, 1),
        to: new Date(2023, 10, 3),
    })

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold">Reports & Analytics</h1>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Generate Report</CardTitle>
                    <CardDescription>Select filters to generate and export reports.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="report-type">Report Type</Label>
                            <Select>
                                <SelectTrigger id="report-type">
                                    <SelectValue placeholder="Select a type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="daily-collection">Daily Collection</SelectItem>
                                    <SelectItem value="pending-list">Pending List</SelectItem>
                                    <SelectItem value="loan-disbursal">Loan Disbursal</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="branch">Branch</Label>
                            <Select>
                                <SelectTrigger id="branch">
                                    <SelectValue placeholder="Select a branch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="main-branch">Main Branch</SelectItem>
                                    <SelectItem value="city-branch">City Branch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="date-range">Date Range</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date-range"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="agent">Agent</Label>
                             <Select>
                                <SelectTrigger id="agent">
                                    <SelectValue placeholder="All Agents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Agents</SelectItem>
                                    <SelectItem value="agent-a">Agent A</SelectItem>
                                    <SelectItem value="agent-b">Agent B</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button className="bg-primary hover:bg-primary/90">Generate Report</Button>
                        <Button variant="outline">
                            <FileDown className="mr-2 h-4 w-4" /> Export
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Daily Collection Report</CardTitle>
                    <CardDescription>November 1, 2023 - November 3, 2023</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Loan ID</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Amount (₹)</TableHead>
                                <TableHead>Collection Date</TableHead>
                                <TableHead>Collected By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {reportData.map((row) => (
                                <TableRow key={row.loanId}>
                                    <TableCell>{row.loanId}</TableCell>
                                    <TableCell>{row.customer}</TableCell>
                                    <TableCell>₹{row.amount.toLocaleString('en-IN')}</TableCell>
                                    <TableCell>{row.date}</TableCell>
                                    <TableCell>{row.agent}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
