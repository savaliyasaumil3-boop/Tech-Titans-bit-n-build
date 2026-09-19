"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  LayoutDashboard,
  Trash2,
  Route,
  Truck,
  Recycle,
  BarChart3,
  Bell,
  Settings,
  Activity,
} from "lucide-react";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Smart Bins", href: "/bins", icon: Trash2 },
  { label: "Collection Routes", href: "/routes", icon: Route },
  { label: "Vehicles", href: "/vehicles", icon: Truck },
  { label: "Waste Classification", href: "/waste-classification", icon: Recycle },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon">
              <Menu className="size-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b border-border px-4 py-4">
            <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
              <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--brand)] text-white text-base">
                <img src="/favicon.svg" alt="logo" />
              </span>
              SwachhSetu
            </SheetTitle>
          </SheetHeader>

          <nav className="flex flex-1 flex-col gap-1 p-3">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/dashboard" && pathname.startsWith(link.href));
              const Icon = link.icon;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[var(--brand-muted)] text-[var(--brand)] dark:bg-[var(--brand-muted)] dark:text-[var(--brand)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <Separator />

          {/* System status */}
          <div className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="size-3.5" />
              <span>System Operational</span>
              <span className="ml-auto size-2 rounded-full bg-[var(--status-healthy)] animate-pulse-live" />
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
