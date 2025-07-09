
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Edit, UserCog } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface UserPermissions {
  canViewLoans: boolean;
  canCollectEMI: boolean;
  canViewCustomers: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  permissions?: Partial<UserPermissions>;
}

const defaultPermissions: UserPermissions = {
  canViewLoans: false,
  canCollectEMI: false,
  canViewCustomers: false,
};

export default function AdminSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedRole, setEditedRole] = useState<'admin' | 'agent' | 'customer'>('customer');
  const [editedPermissions, setEditedPermissions] = useState<UserPermissions>(defaultPermissions);

  const { toast } = useToast();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "users"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as User[];
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({ variant: 'destructive', title: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditedRole(user.role);
    setEditedPermissions({ ...defaultPermissions, ...user.permissions });
  };

  const handleUserUpdate = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const userRef = doc(db, "users", selectedUser.id);
      
      const updateData: any = { role: editedRole };
      if (editedRole === 'agent') {
        updateData.permissions = editedPermissions;
      } else {
        // Remove permissions if not an agent to keep data clean
        updateData.permissions = {};
      }

      await updateDoc(userRef, updateData);
      
      toast({ title: 'Success', description: `User profile for ${selectedUser.name} has been updated.` });
      await fetchUsers(); // Refresh the list
      setSelectedUser(null)
    } catch (error) {
      console.error("Error updating user:", error);
      toast({ variant: 'destructive', title: 'Update failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge variant="destructive">Admin</Badge>;
      case 'agent': return <Badge variant="secondary">Agent</Badge>;
      case 'customer': default: return <Badge variant="outline">Customer</Badge>;
    }
  };
  
  const formatPermissionKey = (key: string) => {
    return key.replace('can', '').replace(/([A-Z])/g, ' $1').trim();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-headline font-semibold flex items-center gap-2"><UserCog /> Admin Settings: User Management</h1>
      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>Manage user roles and agent-specific permissions from here.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Agent Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto" /></TableCell></TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell className="flex flex-wrap gap-1">
                      {user.role === 'agent' && user.permissions && Object.entries(user.permissions).filter(([, val]) => val).map(([key]) => (
                        <Badge key={key} variant="outline" className="font-normal">{formatPermissionKey(key)}</Badge>
                      ))}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog onOpenChange={(isOpen) => !isOpen && setSelectedUser(null)}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => openEditDialog(user)}><Edit className="mr-2 h-4 w-4" /> Edit Role</Button>
                        </DialogTrigger>
                        {selectedUser && selectedUser.id === user.id && (
                          <DialogContent className="sm:max-w-[480px]">
                            <DialogHeader>
                              <DialogTitle>Edit User: {selectedUser.name}</DialogTitle>
                              <DialogDescription>Modify the user's role and permissions. Changes are applied upon saving.</DialogDescription>
                            </DialogHeader>
                            <div className="py-4 space-y-6">
                              <div className="space-y-2">
                                <Label>User Role</Label>
                                <Select onValueChange={(value) => setEditedRole(value as any)} defaultValue={selectedUser.role}>
                                  <SelectTrigger><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="customer">Customer</SelectItem>
                                    <SelectItem value="agent">Agent</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              
                              {editedRole === 'agent' && (
                                <>
                                <Separator />
                                <div className="space-y-4">
                                  <h4 className="font-medium text-sm">Agent Permissions</h4>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id="canViewCustomers" checked={editedPermissions.canViewCustomers} onCheckedChange={(checked) => setEditedPermissions(p => ({...p, canViewCustomers: !!checked}))} />
                                    <Label htmlFor="canViewCustomers" className="font-normal">Can View Customers</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id="canViewLoans" checked={editedPermissions.canViewLoans} onCheckedChange={(checked) => setEditedPermissions(p => ({...p, canViewLoans: !!checked}))} />
                                    <Label htmlFor="canViewLoans" className="font-normal">Can View Loans</Label>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id="canCollectEMI" checked={editedPermissions.canCollectEMI} onCheckedChange={(checked) => setEditedPermissions(p => ({...p, canCollectEMI: !!checked}))} />
                                    <Label htmlFor="canCollectEMI" className="font-normal">Can Collect EMI</Label>
                                  </div>
                                </div>
                                </>
                              )}
                            </div>
                            <DialogFooter>
                              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                              <DialogClose asChild>
                                <Button onClick={handleUserUpdate} disabled={isSubmitting}>
                                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Save Changes
                                </Button>
                              </DialogClose>
                            </DialogFooter>
                          </DialogContent>
                        )}
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
