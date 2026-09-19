"use client";

import { Header } from "@/components/layout/header";
import { KPICards } from "@/components/dashboard/kpi-cards";
import { DynamicMap } from "@/components/map/dynamic-map";
import { CollectionPriority } from "@/components/dashboard/collection-priority";
import { AlertsPanel } from "@/components/dashboard/alerts-panel";
import { WasteGenerationChart } from "@/components/dashboard/waste-generation-chart";
import { WasteCompositionChart } from "@/components/dashboard/waste-composition-chart";
import { LiveIndicator } from "@/components/dashboard/live-indicator";
import { DemoIndicator } from "@/components/dashboard/demo-indicator";
import { PredictionTimeline } from "@/components/dashboard/prediction-timeline";
import { useAppData } from "@/components/providers/app-data-provider";

export default function DashboardPage() {
  const { bins, vehicles } = useAppData();

  return (
    <>
      <Header
        title="Waste Management Dashboard"
        subtitle="Real-time monitoring and AI-powered analytics for Ahmedabad"
      />

      <div className="space-y-6 p-6">
        {/* Live status + Demo indicator */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Overview</h2>
          </div>
          <div className="flex items-center gap-3">
            <DemoIndicator />
            <LiveIndicator />
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards />

        {/* AI Prediction Timeline + Collection Priority — two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PredictionTimeline />
          <AlertsPanel />
        </div>

        {/* Interactive Map */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold tracking-tight">
                Smart Bin Network
              </h3>
              <p className="text-xs text-muted-foreground">
                {bins.length} bins · {vehicles.filter(v => v.status !== "offline" && v.status !== "maintenance").length} vehicles active — color-coded by fill level
              </p>
            </div>
          </div>
          <DynamicMap dbBins={bins} vehicles={vehicles} height={480} />
        </section>

        {/* Collection Priority full width */}
        <CollectionPriority />

        {/* Charts — two columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WasteGenerationChart />
          <WasteCompositionChart />
        </div>
      </div>
    </>
  );
}
