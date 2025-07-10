import { Suspense } from 'react';
import CustomerDetailsClient from './CustomerDetailsClient';
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from '@/components/ui/card';

function CustomerDetailsSkeleton() {
  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-10 w-24" />
        </div>
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-5 w-48" />
                </div>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
                <div>
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full col-span-2" />
                    </div>
                </div>
                 <div>
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                <div>
                    <Skeleton className="h-6 w-48 mb-4" />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full col-span-2" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

export default function CustomerDetailsPage() {
    return (
        <Suspense fallback={<CustomerDetailsSkeleton />}>
            <CustomerDetailsClient />
        </Suspense>
    )
}

