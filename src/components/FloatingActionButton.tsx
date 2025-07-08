"use client"

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, UserPlus, FilePlus, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const fabMenuItems = [
  { href: '/customers/new', label: 'Add Customer', icon: UserPlus },
  { href: '/loans/new', label: 'Add Loan Application', icon: FilePlus },
  { href: '/receipts?action=add', label: 'Add Receipt', icon: Receipt },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
        className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-4"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {/* Expanded Menu Items */}
        <div
            className={cn(
                "flex flex-col items-end gap-4 transition-all duration-300 ease-in-out",
                isOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
            )}
        >
            {fabMenuItems.slice().reverse().map((item) => (
                 <Link href={item.href} key={item.href} className="flex items-center justify-end gap-3 group/fabitem w-max">
                    <span className="bg-card text-card-foreground text-sm font-medium px-4 py-2 rounded-md shadow-md opacity-0 -translate-x-2 group-hover/fabitem:opacity-100 group-hover/fabitem:translate-x-0 transition-all">
                        {item.label}
                    </span>
                     <Button size="icon" className="rounded-full bg-secondary text-secondary-foreground shadow-md w-14 h-14 flex-shrink-0">
                        <item.icon className="h-6 w-6" />
                    </Button>
                </Link>
            ))}
        </div>

        {/* Main FAB */}
        <Button 
            size="icon" 
            className={cn(
                "rounded-full bg-primary hover:bg-primary/90 text-primary-foreground h-16 w-16 shadow-xl transition-transform duration-300",
                isOpen && "rotate-45"
            )}
            onClick={(e) => {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }}
            aria-expanded={isOpen}
            aria-haspopup="true"
        >
            <Plus className="h-8 w-8" />
            <span className="sr-only">Open quick actions</span>
        </Button>
    </div>
  );
}
