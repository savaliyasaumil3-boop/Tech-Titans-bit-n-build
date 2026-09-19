"use client";

import {
  Trash2,
  AlertTriangle,
  Truck,
  Weight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useLiveData } from "@/components/providers/live-data-provider";
import { vehicles } from "@/lib/mock-data";

interface KPI {
  label: string;
  value: string;
  subtitle: string;
  trend: number;
  trendLabel: string;
  icon: React.ReactNode;
  accent?: string;
}

export function KPICards() {
  const { bins } = useLiveData();

  const criticalCount = bins.filter((b) => b.status === "critical").length;
  const activeVehicles = vehicles.filter((v) => v.status === "active").length;
  const totalCollected = vehicles
    .reduce((sum, v) => sum + v.currentLoad, 0)
    .toFixed(1);

  const kpis: KPI[] = [
    {
      label: "Total Smart Bins",
      value: String(bins.length),
      subtitle: "Connected bins across Ahmedabad",
      trend: 8.4,
      trendLabel: "vs last month",
      icon: <Trash2 className="h-5 w-5 text-brand" />,
    },
    {
      label: "Critical Bins",
      value: String(criticalCount),
      subtitle: "Require immediate collection",
      trend: criticalCount > 5 ? 12.5 : -5.2,
      trendLabel: "vs yesterday",
      icon: <AlertTriangle className="h-5 w-5 text-status-critical" />,
      accent: "text-status-critical",
    },
    {
      label: "Active Vehicles",
      value: `${activeVehicles}/${vehicles.length}`,
      subtitle: "Currently operational",
      trend: 0,
      trendLabel: "on schedule",
      icon: <Truck className="h-5 w-5 text-brand" />,
    },
    {
      label: "Waste Collected",
      value: `${totalCollected}t`,
      subtitle: "Today's collections",
      trend: 4.2,
      trendLabel: "vs yesterday",
      icon: <Weight className="h-5 w-5 text-brand" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </p>
                <p className={`text-3xl font-bold tracking-tight ${kpi.accent || "text-foreground"}`}>
                  {kpi.value}
                </p>
                <p className="text-sm text-muted-foreground">{kpi.subtitle}</p>
              </div>
              <div className="rounded-lg bg-muted p-2.5">{kpi.icon}</div>
            </div>

            {kpi.trend !== 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                {kpi.trend > 0 ? (
                  <TrendingUp className="h-3.5 w-3.5 text-status-healthy" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-status-critical" />
                )}
                <span
                  className={
                    kpi.trend > 0
                      ? "font-medium text-status-healthy"
                      : "font-medium text-status-critical"
                  }
                >
                  {kpi.trend > 0 ? "+" : ""}
                  {kpi.trend}%
                </span>
                <span className="text-muted-foreground">{kpi.trendLabel}</span>
              </div>
            )}

            {kpi.trend === 0 && (
              <div className="mt-3 flex items-center gap-1.5 text-xs">
                <div className="h-1.5 w-1.5 rounded-full bg-status-healthy" />
                <span className="text-muted-foreground">{kpi.trendLabel}</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
