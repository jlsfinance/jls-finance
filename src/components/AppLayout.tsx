
"use client";

import React from "react";
import Link from "next/link";
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
  Settings,
  LogOut,
  Banknote,
  ListChecks,
  ListTodo,
  Receipt,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { FloatingActionButton } from "./FloatingActionButton";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/loans", label: "All Loans", icon: ListChecks },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/customers/new", label: "KYC Registration", icon: FileText },
  { href: "/loans/new", label: "Loan Application", icon: HandCoins },
  { href: "/admin/approvals", label: "Loan Approvals", icon: Gavel },
  { href: "/admin/disbursal", label: "Loan Disbursal", icon: Banknote },
  { href: "/collections/due-list", label: "EMI Collection", icon: BookCheck },
  { href: "/emi-calculator", label: "EMI Calculator", icon: Calculator },
  { href: "/receipts", label: "Receipts", icon: Receipt },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar className="no-print">
        <SidebarHeader className="p-4">
          <Link
            href="/dashboard"
            className="flex items-center text-primary font-semibold text-lg"
          >
            <span className="font-headline group-data-[collapsible=icon]:hidden">
              JLS Finance Company
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  isActive={pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard') && (item.href !== '/settings' || pathname === '/settings')}
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
                <SidebarMenuButton tooltip="Logout" asChild>
                  <Link href="/login">
                    <LogOut />
                    <span>Logout</span>
                  </Link>
                </SidebarMenuButton>
             </SidebarMenuItem>
           </SidebarMenu>
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
                    alt="@user"
                    data-ai-hint="user avatar"
                  />
                  <AvatarFallback>JD</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings">Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/login">Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-background">{children}</main>
        {pathname === "/dashboard" && <FloatingActionButton />}
      </SidebarInset>
    </SidebarProvider>
  );
}
