"use client";

import { Search, Bell, User, Settings, LogOut, Moon, Sun } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppData } from "@/components/providers/app-data-provider";
import { useAuth } from "@/components/providers/auth-provider";
import { MobileNav } from "@/components/layout/mobile-nav";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { alerts } = useAppData();
  const { profile, user, signOut } = useAuth();
  const unreadCount = alerts.filter((a) => !a.is_read).length;

  // Dark mode toggle
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("swachhsetu-theme");
    const isDark = saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("swachhsetu-theme", next ? "dark" : "light");
  }

  // Get user initials for avatar
  const initials = profile?.full_name
    ? profile.full_name
        .split(" ")
        .map((n) => n[0])
        .filter(Boolean)
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "AD";

  return (
    <header className="h-16 border-b border-border bg-background/95 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-40 shrink-0">
      {/* Left: Mobile Nav Drawer Trigger + Page Title */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
        <MobileNav />
        <div className="min-w-0">
          <h1 className="text-base sm:text-xl font-semibold tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: Search, Dark Mode, Notifications, User */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Search — hidden on mobile */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search bins, vehicles..."
            className="w-[200px] lg:w-[240px] rounded-lg pl-9 h-9 text-sm"
          />
        </div>

        {/* Dark mode toggle */}
        <Button variant="ghost" size="icon" onClick={toggleTheme} title="Toggle dark mode">
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {/* Notification bell — links to alerts page */}
        <Link href="/alerts">
          <Button variant="ghost" size="icon" className="relative" title="View alerts">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
            <span className="sr-only">Notifications ({unreadCount} unread)</span>
          </Button>
        </Link>

        {/* User avatar dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-medium truncate">{profile?.full_name ?? "Supervisor"}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email ?? ""}
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/settings#profile" />} className="cursor-pointer flex items-center w-full">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />} className="cursor-pointer flex items-center w-full">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
