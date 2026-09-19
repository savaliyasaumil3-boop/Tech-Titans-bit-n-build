"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trash2,
  Route,
  Truck,
  Recycle,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Smart Bins", href: "/bins", icon: Trash2 },
  { label: "Collection Routes", href: "/routes", icon: Route },
  { label: "Vehicles", href: "/vehicles", icon: Truck },
  { label: "Waste Classification", href: "/waste-classification", icon: Recycle },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Alerts", href: "/alerts", icon: Bell },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col fixed inset-y-0 left-0 z-30 bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-2.5 px-4 py-4 min-h-[57px] border-b border-sidebar-border",
          collapsed && "justify-center px-0"
        )}
      >
        <span className="text-xl leading-none select-none">♻</span>
        {!collapsed && (
          <span
            className="text-base font-semibold tracking-tight"
            style={{ color: "#16a34a" }}
          >
            SwachhSetu
          </span>
        )}
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 py-2">
        <nav className="flex flex-col gap-0.5 px-2">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(href);

            const linkEl = (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  collapsed && "justify-center px-0 w-10 mx-auto",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary border-l-2 border-sidebar-primary rounded-l-none"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "shrink-0",
                    collapsed ? "h-5 w-5" : "h-4 w-4",
                    isActive && "text-sidebar-primary"
                  )}
                />
                {!collapsed && <span>{label}</span>}
              </Link>
            );

            if (collapsed) {
              return (
                <Tooltip key={href}>
                  <TooltipTrigger asChild>{linkEl}</TooltipTrigger>
                  <TooltipContent side="right">{label}</TooltipContent>
                </Tooltip>
              );
            }

            return linkEl;
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      {/* Bottom: status + avatar */}
      <div
        className={cn(
          "flex items-center gap-2 px-4 py-3",
          collapsed && "flex-col px-0 py-3 items-center"
        )}
      >
        <div
          className={cn(
            "flex items-center gap-1.5 flex-1",
            collapsed && "flex-col gap-1"
          )}
        >
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          {!collapsed && (
            <span className="text-xs text-muted-foreground">System Online</span>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-7 w-7 shrink-0 cursor-pointer">
              <AvatarFallback className="text-xs bg-sidebar-accent text-sidebar-primary font-semibold">
                AM
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side={collapsed ? "right" : "top"}>
            Admin Manager
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute -right-3 top-[57px] h-6 w-6 rounded-full border border-sidebar-border bg-sidebar shadow-sm hover:bg-sidebar-accent"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </Button>
    </aside>
  );
}
