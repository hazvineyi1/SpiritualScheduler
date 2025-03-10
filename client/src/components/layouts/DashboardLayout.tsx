import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/ui/sidebar";
import { Calendar, Users, CreditCard, Settings } from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const navigationItems = [
    { icon: Calendar, label: "Appointments", href: "/dashboard" },
    { icon: Users, label: "Clients", href: "/dashboard/clients" },
    { icon: CreditCard, label: "Payments", href: "/dashboard/payments" },
    { icon: Settings, label: "Settings", href: "/dashboard/settings" }
  ];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar collapsed={collapsed} onCollapsedChange={setCollapsed}>
        <div className="space-y-4 py-4">
          {navigationItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start"
              >
                <item.icon className="h-5 w-5 mr-2" />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            </Link>
          ))}
        </div>
      </Sidebar>
      
      <main className="flex-1 overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}
