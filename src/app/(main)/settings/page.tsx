
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogClose, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Edit, Trash2, PlusCircle, ShieldCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"


// Mock data for agents - in a real app, this would come from an API
const initialAgents = [
    { id: 'AGENT001', name: 'Raj Kumar', email: 'raj.k@jlsfinance.com', mobile: '9876543210' },
    { id: 'AGENT002', name: 'Meena Gupta', email: 'meena.g@jlsfinance.com', mobile: '8765432109' },
];

// Mock data for permissions
const initialPermissions = {
    viewCustomers: true,
    addEditCustomers: true,
    deleteCustomers: false,
    viewLoans: true,
    applyForLoans: true,
    collectEmis: true,
    viewReports: false,
};

export default function SettingsPage() {
    const [permissions, setPermissions] = useState(initialPermissions);
    const [agents, setAgents] = useState(initialAgents);
    const { toast } = useToast();
    const [isAddAgentOpen, setIsAddAgentOpen] = useState(false);
    const [agentToEdit, setAgentToEdit] = useState<any | null>(null);

    // Effect to load data from localStorage
    useEffect(() => {
        try {
            const storedPermissions = localStorage.getItem('agentPermissions');
            if (storedPermissions) {
                setPermissions(JSON.parse(storedPermissions));
            }
            const storedAgents = localStorage.getItem('agents');
            if (storedAgents) {
                setAgents(JSON.parse(storedAgents));
            } else {
                localStorage.setItem('agents', JSON.stringify(initialAgents));
            }
        } catch (error) {
            console.error("Failed to access localStorage:", error);
        }
    }, []);

    const handlePermissionChange = (permission: keyof typeof permissions) => {
        setPermissions(prev => ({ ...prev, [permission]: !prev[permission] }));
    };

    const savePermissions = () => {
        localStorage.setItem('agentPermissions', JSON.stringify(permissions));
        toast({ title: "Permissions Updated", description: "Agent permissions have been saved successfully." });
    };

    const handleAddAgent = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        const newAgent = {
            id: `AGENT${String(agents.length + 1).padStart(3, '0')}`,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            mobile: formData.get('mobile') as string,
        };

        if (newAgent.name && newAgent.email && newAgent.mobile) {
            const updatedAgents = [...agents, newAgent];
            setAgents(updatedAgents);
            localStorage.setItem('agents', JSON.stringify(updatedAgents));
            toast({ title: "Agent Added", description: `${newAgent.name} has been added.` });
            setIsAddAgentOpen(false);
        } else {
            toast({ variant: 'destructive', title: "Validation Error", description: "All fields are required to add an agent." });
        }
    };

    const handleEditAgent = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!agentToEdit) return;

        const formData = new FormData(event.currentTarget);
        const updatedAgent = {
            ...agentToEdit,
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            mobile: formData.get('mobile') as string,
        };

        const updatedAgents = agents.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent);
        setAgents(updatedAgents);
        localStorage.setItem('agents', JSON.stringify(updatedAgents));
        toast({ title: "Agent Updated", description: `${updatedAgent.name}'s details have been updated.` });
        setAgentToEdit(null);
    };

    const handleRemoveAgent = (agentId: string) => {
        const updatedAgents = agents.filter(agent => agent.id !== agentId);
        setAgents(updatedAgents);
        localStorage.setItem('agents', JSON.stringify(updatedAgents));
        toast({ title: "Agent Removed", description: "The agent has been removed." });
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-headline font-semibold">Settings</h1>

            <Tabs defaultValue="permissions" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="permissions">Agent Permissions</TabsTrigger>
                    <TabsTrigger value="users">User Management</TabsTrigger>
                    <TabsTrigger value="account">Account Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="permissions" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agent Access Control</CardTitle>
                            <CardDescription>Control what features your agents can access in the portal.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-4">
                                {Object.entries(permissions).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <Label htmlFor={key} className="text-base font-medium capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
                                        <Switch
                                            id={key}
                                            checked={value}
                                            onCheckedChange={() => handlePermissionChange(key as keyof typeof permissions)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                        <CardFooter>
                           <Button onClick={savePermissions} className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground"><ShieldCheck className="mr-2 h-4 w-4" /> Save Permissions</Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Agent Management</CardTitle>
                                    <CardDescription>Add, edit, or remove agent accounts.</CardDescription>
                                </div>
                                <Dialog open={isAddAgentOpen} onOpenChange={setIsAddAgentOpen}>
                                    <DialogTrigger asChild>
                                        <Button><PlusCircle className="mr-2 h-4 w-4" /> Add Agent</Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Add New Agent</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleAddAgent} className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">Full Name</Label>
                                                <Input id="name" name="name" placeholder="Agent's full name" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="email">Email</Label>
                                                <Input id="email" name="email" type="email" placeholder="agent@example.com" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="mobile">Mobile Number</Label>
                                                <Input id="mobile" name="mobile" type="tel" placeholder="10-digit number" required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="password">Temporary Password</Label>
                                                <Input id="password" name="password" type="password" required />
                                            </div>
                                            <DialogFooter>
                                                <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                <Button type="submit">Add Agent</Button>
                                            </DialogFooter>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Mobile</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.map((agent) => (
                                        <TableRow key={agent.id}>
                                            <TableCell className="font-medium">{agent.name}</TableCell>
                                            <TableCell>{agent.email}</TableCell>
                                            <TableCell>{agent.mobile}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Dialog open={agentToEdit?.id === agent.id} onOpenChange={(isOpen) => !isOpen && setAgentToEdit(null)}>
                                                    <DialogTrigger asChild><Button variant="ghost" size="icon" onClick={() => setAgentToEdit(agent)}><Edit className="h-4 w-4" /></Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Edit Agent: {agent.name}</DialogTitle></DialogHeader>
                                                        <form onSubmit={handleEditAgent} className="space-y-4">
                                                            <div className="space-y-2"><Label htmlFor="edit-name">Full Name</Label><Input id="edit-name" name="name" defaultValue={agent.name} required /></div>
                                                            <div className="space-y-2"><Label htmlFor="edit-email">Email</Label><Input id="edit-email" name="email" type="email" defaultValue={agent.email} required /></div>
                                                            <div className="space-y-2"><Label htmlFor="edit-mobile">Mobile Number</Label><Input id="edit-mobile" name="mobile" type="tel" defaultValue={agent.mobile} required /></div>
                                                            <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button type="submit">Save Changes</Button></DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                                <Dialog>
                                                    <DialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader><DialogTitle>Confirm Removal</DialogTitle><DialogDescription>Are you sure you want to remove agent {agent.name}? This action cannot be undone.</DialogDescription></DialogHeader>
                                                        <DialogFooter>
                                                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                                            <DialogClose asChild><Button variant="destructive" onClick={() => handleRemoveAgent(agent.id)}>Remove Agent</Button></DialogClose>
                                                        </DialogFooter>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="account" className="mt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle>Change Admin Password</CardTitle>
                                <CardDescription>Update your own login password.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input id="current-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input id="confirm-password" type="password" />
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button className="ml-auto">Update Password</Button>
                            </CardFooter>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle>Reset Agent Password</CardTitle>
                                <CardDescription>Generate a new temporary password for an agent.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                 <div className="space-y-2">
                                    <Label htmlFor="select-agent">Select Agent</Label>
                                    <Select>
                                        <SelectTrigger id="select-agent"><SelectValue placeholder="Choose an agent to reset..." /></SelectTrigger>
                                        <SelectContent>
                                            {agents.map((agent) => (
                                                <SelectItem key={agent.id} value={agent.id}>{agent.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                                    A new temporary password will be generated and displayed here. Please share it securely with the agent.
                                </div>
                            </CardContent>
                            <CardFooter>
                                <Button variant="destructive" className="ml-auto">Reset Password</Button>
                            </CardFooter>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
