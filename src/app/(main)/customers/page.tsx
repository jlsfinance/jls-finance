"use client"
import React, { useState, useMemo, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, PlusCircle, FileDown } from "lucide-react"
import Link from 'next/link'

const initialCustomers = [
  { id: 'CUST001', name: 'Liam Johnson', email: 'liam@example.com', mobile: '9876543210', aadhaar: '**** **** 1234', pan: 'ABCDE1234F', status: 'Active', dob: '1990-05-15', gender: 'Male', maritalStatus: 'Married', fatherName: 'Robert Johnson', address: '123 Maple Street', city: 'Springfield', state: 'Illinois', pincode: '62704', photo: 'https://placehold.co/150x150.png' },
  { id: 'CUST002', name: 'Olivia Smith', email: 'olivia@example.com', mobile: '8765432109', aadhaar: '**** **** 5678', pan: 'FGHIJ5678K', status: 'Active', dob: '1988-11-20', gender: 'Female', maritalStatus: 'Single', fatherName: 'David Smith', address: '456 Oak Avenue', city: 'Shelbyville', state: 'Illinois', pincode: '62565', photo: 'https://placehold.co/150x150.png' },
  { id: 'CUST003', name: 'Noah Williams', email: 'noah@example.com', mobile: '7654321098', aadhaar: '**** **** 9012', pan: 'KLMNO9012L', status: 'Inactive', dob: '1995-02-10', gender: 'Male', maritalStatus: 'Single', fatherName: 'James Williams', address: '789 Pine Lane', city: 'Capital City', state: 'Illinois', pincode: '62701', photo: 'https://placehold.co/150x150.png' },
  { id: 'CUST004', name: 'Emma Brown', email: 'emma@example.com', mobile: '6543210987', aadhaar: '**** **** 3456', pan: 'PQRST3456M', status: 'Active', dob: '1992-08-25', gender: 'Female', maritalStatus: 'Married', fatherName: 'Michael Brown', address: '101 Birch Road', city: 'Springfield', state: 'Illinois', pincode: '62704', photo: 'https://placehold.co/150x150.png' },
  { id: 'CUST005', name: 'Oliver Jones', email: 'oliver@example.com', mobile: '5432109876', aadhaar: '**** **** 7890', pan: 'UVWXY7890N', status: 'Active', dob: '1985-12-30', gender: 'Male', maritalStatus: 'Divorced', fatherName: 'William Jones', address: '212 Cedar Blvd', city: 'Ogdenville', state: 'Illinois', pincode: '62670', photo: 'https://placehold.co/150x150.png' },
]

export default function CustomersPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    try {
        const storedCustomers = localStorage.getItem('customers');
        if (storedCustomers) {
            setCustomers(JSON.parse(storedCustomers));
        } else {
            localStorage.setItem('customers', JSON.stringify(initialCustomers));
            setCustomers(initialCustomers);
        }
    } catch (error) {
        console.error("Failed to access localStorage:", error);
        setCustomers(initialCustomers);
    }
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowercasedFilter = searchTerm.toLowerCase()
    return customers.filter(customer =>
      customer.name.toLowerCase().includes(lowercasedFilter) ||
      customer.email.toLowerCase().includes(lowercasedFilter) ||
      customer.mobile.includes(lowercasedFilter) ||
      customer.id.toLowerCase().includes(lowercasedFilter)
    )
  }, [searchTerm, customers])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-headline font-semibold">Customer Management</h1>
        <div className="flex items-center gap-2">
            <Button variant="outline">
                <FileDown className="mr-2 h-4 w-4" />
                Export
            </Button>
            <Link href="/customers/new" passHref>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                </Button>
            </Link>
        </div>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input 
          placeholder="Search by Name, Email, Mobile, Aadhaar, PAN..." 
          className="pl-10"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Aadhaar / PAN</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCustomers.length > 0 ? filteredCustomers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.id}</TableCell>
                <TableCell>{customer.name}</TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span>{customer.email}</span>
                        <span className="text-muted-foreground text-sm">{customer.mobile}</span>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex flex-col">
                        <span>{customer.aadhaar}</span>
                        <span className="font-mono text-muted-foreground text-sm">{customer.pan}</span>
                    </div>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.status === 'Active' ? 'default' : 'secondary'} className={customer.status === 'Active' ? 'bg-accent text-accent-foreground' : ''}>
                    {customer.status}
                  </Badge>
                </TableCell>
                <TableCell>
                    <Button variant="link" size="sm" asChild>
                        <Link href={`/customers/${customer.id}`}>View</Link>
                    </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  {customers.length === 0 ? "Loading customers..." : "No customers found."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
