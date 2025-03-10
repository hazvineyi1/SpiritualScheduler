import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CreditCard, Settings, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { icon: Calendar, label: "Appointments", href: "/dashboard" },
  { icon: Users, label: "Clients", href: "/dashboard/clients" },
  { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
  { icon: Settings, label: "Settings", href: "/dashboard/settings" }
];

const NavigationContent = () => (
  <div className="space-y-4 py-4">
    {navigationItems.map((item) => (
      <Link key={item.href} href={item.href}>
        <Button
          variant="ghost"
          className="w-full justify-start"
        >
          <item.icon className="h-5 w-5 mr-2" />
          <span>{item.label}</span>
        </Button>
      </Link>
    ))}
  </div>
);

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r">
        <div className="p-6">
          <h2 className="text-lg font-semibold">Dashboard</h2>
        </div>
        <NavigationContent />
      </aside>

      {/* Mobile Navigation */}
      <Sheet>
        <SheetTrigger asChild className="md:hidden absolute left-4 top-4">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64">
          <div className="py-6">
            <h2 className="text-lg font-semibold mb-4">Dashboard</h2>
            <NavigationContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}