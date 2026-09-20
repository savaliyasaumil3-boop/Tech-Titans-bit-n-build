"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ArrowRight, Sparkles, ImagePlus } from "lucide-react";
import { getClassificationStats } from "@/lib/supabase/queries";
import type { ClassificationStats } from "@/lib/db-types";

export default function DashboardPage() {
  const { bins, vehicles } = useAppData();
  const [classStats, setClassStats] = useState<ClassificationStats | null>(null);

  useEffect(() => {
    getClassificationStats().then(setClassStats);
  }, []);

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

        {/* AI Waste Classification Quick Card */}
        <Card className="shadow-none border-primary/20 bg-gradient-to-r from-primary/5 via-background to-background">
          <CardContent className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10 text-primary">
                  <BrainCircuit className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">AI Waste Classification</h3>
                  <p className="text-xs text-muted-foreground">
                    Upload waste images for real-time MobileNetV2 neural inference
                  </p>
                  {classStats && classStats.total > 0 && (
                    <div className="flex items-center gap-3 mt-1.5 text-xs">
                      <span className="flex items-center gap-1 text-primary">
                        <ImagePlus className="h-3 w-3" />
                        {classStats.total} classified
                      </span>
                      <span className="flex items-center gap-1 text-green-600">
                        <Sparkles className="h-3 w-3" />
                        {(classStats.avg_confidence * 100).toFixed(0)}% avg confidence
                      </span>
                      {classStats.most_detected && (
                        <span className="text-muted-foreground">
                          Top: {classStats.most_detected}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <Link href="/waste-classification">
                <Button size="sm" className="gap-1.5 text-xs">
                  Classify Waste
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Charts — two columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WasteGenerationChart />
          <WasteCompositionChart />
        </div>
      </div>
    </>
  );
}
