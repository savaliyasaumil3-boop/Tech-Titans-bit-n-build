"use client";

import { Header } from "@/components/layout/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { DynamicMap } from "@/components/map/dynamic-map";
import { CollectionPriority } from "@/components/dashboard/collection-priority";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { WasteGenerationChart } from "@/components/dashboard/waste-generation-chart";
import { WasteCompositionChart } from "@/components/dashboard/waste-composition-chart";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { useLiveData } from "@/components/providers/live-data-provider";

export default function DashboardPage() {
  const { bins } = useLiveData();

  return (
    <>
      <Header
        title="Waste Management Dashboard"
        subtitle="Real-time monitoring and analytics for Ahmedabad"
      />

      <div className="space-y-6 p-6">
        {/* Live status */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">
              Overview
            </h2>
          </div>
          <LiveIndicator />
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* Interactive Map */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Smart Bin Network
              </h3>
              <p className="text-xs text-muted-foreground">
                {bins.length} bins across Ahmedabad — color-coded by fill level
              </p>
            </div>
          </div>
          <DynamicMap bins={bins} />
        </section>

        {/* Collection Priority + Alerts — two columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <CollectionPriority />
          </div>
          <div className="lg:col-span-2">
            <AlertsPanel />
          </div>
        </div>

        {/* Charts — two columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WasteGenerationChart />
          <WasteCompositionChart />
        </div>
      </div>
    </>
  );
}
