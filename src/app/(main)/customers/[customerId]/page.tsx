
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
import { db, storage } from "@/lib/firebase";
import { doc, getDoc } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  aadhaar?: string;
  pan?: string;
  status: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  photo: string; // This is the path in Firebase Storage
  photoUrl?: string; // This will be the public URL
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (customerId) {
        setLoading(true);
        try {
          const customerRef = doc(db, 'customers', customerId);
          const docSnap = await getDoc(customerRef);

          if (!docSnap.exists()) {
            throw new Error("Customer not found");
          }
          
          const data = docSnap.data() as Omit<Customer, 'id'>;
          let photoUrl = 'https://placehold.co/400x400.png';
          if (data.photo) {
            try {
              const photoRef = ref(storage, data.photo);
              photoUrl = await getDownloadURL(photoRef);
            } catch (storageError) {
                console.error("Could not fetch photo from Firebase Storage:", storageError);
                toast({
                    variant: "destructive",
                    title: "Image Load Failed",
                    description: "The customer photo could not be loaded.",
                });
            }
          }
          setCustomer({ id: docSnap.id, ...data, photoUrl });

        } catch (error: any) {
          console.error("Failed to load customer:", error);
          toast({
            variant: "destructive",
            title: "Load Failed",
            description: "Could not load customer profile from Firestore.",
          });
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId, toast]);

  if (loading) {
    return <div className="flex items-center justify-center h-full p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
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
          <Avatar className="h-24 w-24 border-4 border-white shadow-md">
            <AvatarImage src={customer.photoUrl || placeholderImage} alt={customer.name} data-ai-hint="person portrait" />
            <AvatarFallback>{customer.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
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
                <div><span className="font-medium text-muted-foreground block">Mobile Number</span> {customer.phone}</div>
                <div><span className="font-medium text-muted-foreground block">Email Address</span> {customer.email || 'N/A'}</div>
                <div className="col-span-full"><span className="font-medium text-muted-foreground block">Full Address</span> {`${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">KYC Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Aadhaar Number</span> {customer.aadhaar || 'N/A'}</div>
                <div><span className="font-medium text-muted-foreground block">PAN Number</span> {customer.pan || 'N/A'}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">KYC Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Dialog>
                  <DialogTrigger asChild>
                    <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                      <CardContent className="p-0">
                        <Image
                          src={customer.photoUrl || placeholderImage}
                          alt="Customer Photo"
                          width={400}
                          height={400}
                          className="object-cover w-full h-auto aspect-square"
                          data-ai-hint="person portrait"
                        />
                      </CardContent>
                      <div className="p-4 bg-card">
                        <h4 className="font-semibold text-center">Customer Photo</h4>
                      </div>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl p-0">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Customer Photo Preview</DialogTitle>
                      <DialogDescription className="sr-only">A larger view of the customer's photo.</DialogDescription>
                    </DialogHeader>
                    <Image
                      src={customer.photoUrl || placeholderImage}
                      alt="Customer Photo"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="person portrait"
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
