
"use client"

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  aadhaar: string;
  pan: string;
  voter_id: string;
  status: string;
  address: string;
  photo_url: string;
  guarantor: {
    name: string;
    mobile: string;
    address: string;
    relation: string;
  };
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (customerId) {
      const fetchCustomer = async () => {
        setLoading(true);
        try {
          const docRef = doc(db, "customers", customerId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setCustomer({ id: docSnap.id, ...docSnap.data() } as Customer);
          } else {
            toast({
              variant: "destructive",
              title: "Not Found",
              description: "No such customer document!",
            });
            setCustomer(null);
          }
        } catch (error) {
          console.error("Error fetching customer from Firestore:", error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to fetch customer data.",
          });
        } finally {
          setLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [customerId, toast]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!customer) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Customer Not Found</CardTitle>
          <CardDescription>The customer profile you are trying to access does not exist or could not be loaded.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => router.push('/customers')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customer List
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  const placeholderImage = 'https://placehold.co/400x400.png';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-2xl font-headline font-semibold">Customer Profile</h1>
        <Button onClick={() => window.print()} variant="outline">
            <Printer className="mr-2 h-4 w-4" /> Print
        </Button>
      </div>

      <Card id="printable-area" className="w-full max-w-4xl mx-auto shadow-lg bg-card">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-primary/5">
           <Dialog>
              <DialogTrigger asChild>
                <Avatar className="h-24 w-24 border-4 border-white shadow-md cursor-pointer">
                    <AvatarImage src={customer.photo_url || placeholderImage} alt={customer.name} data-ai-hint="person portrait" />
                    <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
              </DialogTrigger>
              <DialogContent className="max-w-xl p-0">
                    <Image
                      src={customer.photo_url || placeholderImage}
                      alt="Customer Photo"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="person portrait"
                    />
               </DialogContent>
           </Dialog>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold">{customer.name}</CardTitle>
            <div className="flex items-center gap-4">
              <CardDescription className="text-md">Customer ID: {customer.id}</CardDescription>
              <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'} className={customer.status === 'Active' ? 'bg-accent text-accent-foreground' : ''}>
                {customer.status}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-8">

            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Mobile Number</span> {customer.mobile}</div>
                <div><span className="font-medium text-muted-foreground block">Email Address</span> {customer.email || 'N/A'}</div>
                <div className="col-span-full"><span className="font-medium text-muted-foreground block">Full Address</span> {customer.address || 'N/A'}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">KYC Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Aadhaar Number</span> {customer.aadhaar || 'N/A'}</div>
                <div><span className="font-medium text-muted-foreground block">PAN Number</span> {customer.pan || 'N/A'}</div>
                <div><span className="font-medium text-muted-foreground block">Voter ID</span> {customer.voter_id || 'N/A'}</div>
              </div>
            </div>

            {customer.guarantor && customer.guarantor.name && (
                <div>
                    <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">Guarantor Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
                        <div><span className="font-medium text-muted-foreground block">Guarantor Name</span> {customer.guarantor.name}</div>
                        <div><span className="font-medium text-muted-foreground block">Guarantor Mobile</span> {customer.guarantor.mobile}</div>
                        <div className="md:col-span-2"><span className="font-medium text-muted-foreground block">Guarantor Address</span> {customer.guarantor.address}</div>
                        <div><span className="font-medium text-muted-foreground block">Relation</span> {customer.guarantor.relation}</div>
                    </div>
                </div>
            )}

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
