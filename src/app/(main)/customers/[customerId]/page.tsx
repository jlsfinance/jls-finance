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
import jsPDF from 'jspdf';

interface Customer {
  id: string;
  name: string;
  email: string;
  mobile: string;
  aadhaar: string;
  pan: string;
  status: string;
  dob: string;
  gender: string;
  maritalStatus: string;
  fatherName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  photo: string;
}

export default function CustomerDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.customerId as string;
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (customerId) {
      try {
        const storedCustomers = localStorage.getItem('customers');
        if (storedCustomers) {
          const customers = JSON.parse(storedCustomers);
          const foundCustomer = customers.find((c: Customer) => c.id === customerId);
          setCustomer(foundCustomer || null);
        }
      } catch (error) {
        console.error("Failed to load customer from localStorage:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [customerId]);

  const handlePrint = async () => {
    if (!customer) return;

    setIsPrinting(true);
    
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = 15;

        // Header
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text('JLS FINANCE LTD', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 10;
        
        doc.setFontSize(14);
        doc.setFont("helvetica", "normal");
        doc.text('Customer Profile', doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
        y += 15;

        // --- Personal Information ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Personal Information', 15, y);
        y += 7;
        doc.line(15, y - 5, doc.internal.pageSize.getWidth() - 15, y - 5);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Full Name: ${customer.name}`, 15, y);
        doc.text(`Date of Birth: ${customer.dob}`, 100, y);
        y += 7;
        doc.text(`Gender: ${customer.gender}`, 15, y);
        doc.text(`Marital Status: ${customer.maritalStatus}`, 100, y);
        y += 7;
        doc.text(`Father's/Spouse's Name: ${customer.fatherName}`, 15, y);
        y += 12;

        // --- Contact Details ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('Contact Details', 15, y);
        y += 7;
        doc.line(15, y - 5, doc.internal.pageSize.getWidth() - 15, y - 5);
        
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Mobile Number: ${customer.mobile}`, 15, y);
        doc.text(`Email Address: ${customer.email}`, 100, y);
        y += 7;
        const addressLines = doc.splitTextToSize(`Full Address: ${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`, 180);
        doc.text(addressLines, 15, y);
        y += (addressLines.length * 5) + 5;


        // --- KYC Details ---
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text('KYC Details', 15, y);
        y += 7;
        doc.line(15, y - 5, doc.internal.pageSize.getWidth() - 15, y - 5);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Aadhaar Number: ${customer.aadhaar}`, 15, y);
        doc.text(`PAN Number: ${customer.pan}`, 100, y);
        y += 7;
        doc.text(`KYC Documents: On File`, 15, y);
        y += 12;
        
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
            description: "Could not generate the PDF. Please try again.",
        });
    } finally {
        setIsPrinting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading customer details...</div>;
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
            <AvatarImage src={customer.photo || placeholderImage} alt={customer.name} data-ai-hint="person portrait" />
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
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Date of Birth</span> {customer.dob}</div>
                <div><span className="font-medium text-muted-foreground block">Gender</span> {customer.gender}</div>
                <div><span className="font-medium text-muted-foreground block">Marital Status</span> {customer.maritalStatus}</div>
                <div className="md:col-span-2"><span className="font-medium text-muted-foreground block">Father's/Spouse's Name</span> {customer.fatherName}</div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">Contact Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Mobile Number</span> {customer.mobile}</div>
                <div className="md:col-span-2"><span className="font-medium text-muted-foreground block">Email Address</span> {customer.email}</div>
                <div className="col-span-full"><span className="font-medium text-muted-foreground block">Full Address</span> {`${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}`}</div>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4 text-primary border-b pb-2">KYC Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 text-sm">
                <div><span className="font-medium text-muted-foreground block">Aadhaar Number</span> {customer.aadhaar}</div>
                <div><span className="font-medium text-muted-foreground block">PAN Number</span> {customer.pan}</div>
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
                          src={customer.photo || placeholderImage}
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
                      src={customer.photo || placeholderImage}
                      alt="Customer Photo"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="person portrait"
                    />
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                      <CardContent className="p-0">
                        <Image
                          src="https://placehold.co/600x400.png"
                          alt="Aadhaar Card"
                          width={400}
                          height={400}
                          className="object-cover w-full h-auto aspect-square"
                          data-ai-hint="document id card"
                        />
                      </CardContent>
                      <div className="p-4 bg-card">
                        <h4 className="font-semibold text-center">Aadhaar Card</h4>
                      </div>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl p-0">
                    <DialogHeader>
                      <DialogTitle className="sr-only">Aadhaar Card Preview</DialogTitle>
                      <DialogDescription className="sr-only">A larger view of the Aadhaar card.</DialogDescription>
                    </DialogHeader>
                    <Image
                      src="https://placehold.co/600x400.png"
                      alt="Aadhaar Card"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="document id card"
                    />
                  </DialogContent>
                </Dialog>

                <Dialog>
                  <DialogTrigger asChild>
                    <Card className="overflow-hidden cursor-pointer hover:shadow-xl transition-shadow">
                      <CardContent className="p-0">
                        <Image
                          src="https://placehold.co/600x400.png"
                          alt="PAN Card"
                          width={400}
                          height={400}
                          className="object-cover w-full h-auto aspect-square"
                          data-ai-hint="document id card"
                        />
                      </CardContent>
                      <div className="p-4 bg-card">
                        <h4 className="font-semibold text-center">PAN Card</h4>
                      </div>
                    </Card>
                  </DialogTrigger>
                  <DialogContent className="max-w-xl p-0">
                    <DialogHeader>
                      <DialogTitle className="sr-only">PAN Card Preview</DialogTitle>
                       <DialogDescription className="sr-only">A larger view of the PAN card.</DialogDescription>
                    </DialogHeader>
                    <Image
                      src="https://placehold.co/600x400.png"
                      alt="PAN Card"
                      width={800}
                      height={800}
                      className="w-full h-auto rounded-lg"
                      data-ai-hint="document id card"
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
