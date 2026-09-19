"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppDataProvider } from "@/components/providers/app-data-provider";
import { SmartBinViewer } from "@/components/3d/SmartBinViewer";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/providers/auth-provider";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { profile, loading } = useAuth();

  useEffect(() => {
    if (!loading && !profile) router.replace("/login");
    if (!loading && profile?.role === "driver") router.replace("/driver/dashboard");
  }, [loading, profile, router]);

  if (loading || !profile || profile.role !== "supervisor") {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Checking access...</div>;
  }

  return (
    <AppDataProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Desktop sidebar */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* Main content — offset by sidebar width */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 h-screen overflow-hidden transition-all duration-300",
            collapsed ? "lg:ml-16" : "lg:ml-64"
          )}
        >
          {/* Mobile nav header */}
          <div className="lg:hidden flex items-center h-14 px-4 border-b border-border bg-background/95 backdrop-blur-md shrink-0 z-40">
            <MobileNav />
            <span className="ml-3 text-lg font-semibold tracking-tight">SwachhSetu</span>
          </div>

          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>

      {/* 3D Smart Bin Digital Twin Inspection Modal */}
      <SmartBinViewer />
    </AppDataProvider>
  );
}
