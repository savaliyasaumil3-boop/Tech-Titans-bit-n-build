"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { LiveDataProvider } from "@/components/providers/live-data-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <LiveDataProvider>
      <div className="flex h-full min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile nav header */}
          <div className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <MobileNav />
            <span className="ml-3 text-lg font-semibold tracking-tight">SwachhSetu</span>
          </div>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </LiveDataProvider>
  );
}
