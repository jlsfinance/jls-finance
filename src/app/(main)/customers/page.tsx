
"use client"
import React, { useState, useMemo, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, PlusCircle, FileDown, Loader2 } from "lucide-react"
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useToast } from "@/hooks/use-toast"

interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  status: string;
  photo_url: string;
}

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const { data: customerData, error } = await supabase
          .from('customers')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        if (customerData) {
          setCustomers(customerData);
        }

      } catch (error: any) {
        console.error("Failed to fetch customers:", error);
        toast({
          variant: "destructive",
          title: "Fetch Failed",
          description: "Could not load customers from the database.",
        });
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, [toast]);
  
  const filteredCustomers = useMemo(() => {
    const lowercasedFilter = searchTerm.toLowerCase()
    return customers.filter(customer =>
      (customer.name || '').toLowerCase().includes(lowercasedFilter) ||
      (customer.id || '').toLowerCase().includes(lowercasedFilter) ||
      (customer.phone && customer.phone.includes(searchTerm))
    );
  }, [searchTerm, customers])

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-headline font-semibold">All Customers</h1>
          <div className="flex items-center gap-2">
              <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  Export
              </Button>
              <Link href="/customers/new">
                  <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add New Customer
                  </Button>
              </Link>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search by Name, Customer ID, Phone..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                    <p>Loading customers from Supabase...</p>
                  </TableCell>
                </TableRow>
              ) : filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                      <div className="flex items-center gap-3">
                          <Avatar>
                              <AvatarImage src={customer.photo_url} alt={customer.name} />
                              <AvatarFallback>{customer.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="font-medium">{customer.name}</div>
                      </div>
                  </TableCell>
                  <TableCell>
                    <div>{customer.phone}</div>
                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                  </TableCell>
                  <TableCell>{customer.address}</TableCell>
                  <TableCell>{customer.status}</TableCell>
                  <TableCell>
                      <Button variant="link" size="sm" asChild>
                          <Link href={`/customers/details?id=${customer.id}`}>View Details</Link>
                      </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No customers found in Supabase.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
    </div>
  );
}
