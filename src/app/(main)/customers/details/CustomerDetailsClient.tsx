
"use client"

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from "@/hooks/use-toast";
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  address: string;
  photo_url?: string;
}

export default function CustomerDetailsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomer = async () => {
      if (customerId) {
        try {
          setLoading(true);
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', customerId)
            .single();

          if (error) throw error;
          
          setCustomer(data);
        } catch (error: any) {
          console.error("Failed to load customer:", error);
          toast({
            variant: "destructive",
            title: "Load Failed",
            description: "Could not load customer profile from Supabase.",
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

  const handlePrint = async () => {
    if (!customer) return;

    setIsPrinting(true);
    
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = 15;

        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('JLS FINANCE LTD', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text('Customer Profile', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 15;

        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Personal & Contact Information', 15, y);
        y += 7;
        doc.line(15, y - 5, doc.internal.pageSize.getWidth() - 15, y - 5);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Full Name: ${customer.name}`, 15, y);
        y += 7;
        doc.text(`Mobile Number: ${customer.phone || 'N/A'}`, 15, y);
        doc.text(`Email Address: ${customer.email || 'N/A'}`, 100, y);
        y += 7;
        const addressLines = doc.splitTextToSize(`Address: ${customer.address || 'N/A'}`, 180);
        doc.text(addressLines, 15, y);
        
        doc.save(`Customer_Profile_${customer.name.replace(/\s+/g, '_')}.pdf`);

        toast({
            title: "Download Successful",
            description: "Customer Profile PDF downloaded successfully!",
        });

    } catch (error) {
        console.error("Failed to generate PDF:", error);
        toast({
            variant: "destructive",
            title: "Download Failed",
            description: "Could not generate the PDF.",
        });
    } finally {
        setIsPrinting(false);
    }
  };

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
        <Button onClick={handlePrint} disabled={isPrinting} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          {isPrinting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Printing...
            </>
          ) : (
            <>
              <Printer className="mr-2 h-4 w-4" /> Print
            </>
          )}
        </Button>
      </div>

      <Card id="printable-area" className="w-full max-w-4xl mx-auto shadow-lg bg-card">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center gap-6 p-6 bg-primary/5">
          <Avatar className="h-24 w-24 border-4 border-white shadow-md">
            <AvatarImage src={customer.photo_url || placeholderImage} alt={customer.name} data-ai-hint="person portrait" />
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
                <div><span className="font-medium text-muted-foreground block">Phone Number</span> {customer.phone || 'N/A'}</div>
                <div><span className="font-medium text-muted-foreground block">Email Address</span> {customer.email || 'N/A'}</div>
                <div className="col-span-full"><span className="font-medium text-muted-foreground block">Full Address</span> {customer.address || 'N/A'}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
