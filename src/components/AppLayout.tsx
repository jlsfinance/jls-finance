"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/context/AuthContext";

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  Users,
  FileText,
  HandCoins,
  Gavel,
  BookCheck,
  BarChart3,
  Calculator,
  LogOut,
  Banknote,
  ListChecks,
  Receipt,
  UserCog,
  Loader2,
} from "lucide-react";

import { FloatingActionButton } from "./FloatingActionButton";
import { useToast } from "@/hooks/use-toast";

const allMenuItems = [
  // General
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ['admin', 'agent', 'customer'] },
  
  // Customer & Loan Management (Agent + Admin)
  { href: "/customers", label: "Customers", icon: Users, roles: ['admin', 'agent'] },
  { href: "/loans", label: "All Loans", icon: ListChecks, roles: ['admin', 'agent'] },
  { href: "/collections/due-list", label: "EMI Collection", icon: BookCheck, roles: ['admin', 'agent'] },
  { href: "/receipts", label: "Receipts", icon: Receipt, roles: ['admin', 'agent'] },

  // Actions (Agent + Admin)
  { href: "/customers/new", label: "KYC Registration", icon: FileText, roles: ['admin', 'agent'] },
  { href: "/loans/new", label: "Loan Application", icon: HandCoins, roles: ['admin', 'agent'] },
  
  // Tools (All)
  { href: "/emi-calculator", label: "EMI Calculator", icon: Calculator, roles: ['admin', 'agent', 'customer'] },

  // Admin Section
  { href: "/admin/approvals", label: "Loan Approvals", icon: Gavel, roles: ['admin'] },
  { href: "/admin/disbursal", label: "Loan Disbursal", icon: Banknote, roles: ['admin'] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ['admin'] },
  { href: "/admin/settings", label: "User Management", icon: UserCog, roles: ['admin'] },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="animate-spin h-8 w-8" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  // Redirect if not authenticated
  if (!user) {
    router.push('/login');
    return null;
  }
  
  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "An error occurred while logging out.",
      });
    }
  };
  
  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    if (!user || !user.role) return false;
    return item.roles.includes(user.role);
  });

  return (
    <SidebarProvider>
      <Sidebar className="no-print">
        <SidebarHeader className="p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-primary font-semibold text-lg"
          >
            <Banknote />
            <span className="font-headline group-data-[collapsible=icon]:hidden">
              JLS Finance
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={
                    pathname === item.href || 
                    (item.href !== '/dashboard' && pathname.startsWith(item.href))
                  }
                  tooltip={item.label}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton tooltip="Logout" onClick={handleLogout}>
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          
          {/* Made with Love Footer */}
          <div className="px-4 py-3 mt-auto border-t border-sidebar-border">
            <p className="text-xs text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
              made with ❤️ by <span className="font-semibold text-primary">luvi</span>
            </p>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b bg-card px-4 lg:px-6 no-print">
          <div className="md:hidden">
            <SidebarTrigger />
          </div>
          <div className="flex-1 text-center font-headline text-lg font-semibold md:text-left">
            JLS Finance Portal
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage
                    src="https://placehold.co/40x40.png"
                    alt={user?.name || 'User'}
                  />
                  <AvatarFallback>
                    {user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {user?.name || 'My Account'}
                <div className="text-xs text-muted-foreground">
                  {user?.role}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">
          {children}
        </main>
        {pathname === "/dashboard" && <FloatingActionButton />}
      </SidebarInset>
    </SidebarProvider>
  );
}
