import { Suspense } from 'react';
import ReceiptsClient from './ReceiptsClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function ReceiptsPageSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-headline font-semibold">Payment Receipts</h1>
            <Skeleton className="h-10 w-32" />
        </div>
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>All Receipts</CardTitle>
                <CardDescription>View and download payment receipts.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Receipt ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Loan ID</TableHead>
                            <TableHead>Amount (₹)</TableHead>
                            <TableHead>Payment Date</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[150px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[120px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[100px]" /></TableCell>
                                <TableCell><Skeleton className="h-5 w-[80px]" /></TableCell>
                                <TableCell className="text-center"><Skeleton className="h-8 w-32" /></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    </div>
  )
}

export default function ReceiptsPage() {
    return (
        <Suspense fallback={<ReceiptsPageSkeleton />}>
            <ReceiptsClient />
        </Suspense>
    )
}
