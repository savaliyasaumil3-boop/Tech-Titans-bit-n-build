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
import { useAppData } from "@/components/providers/app-data-provider";

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
  const { bins, vehicles } = useAppData();

  const criticalCount = bins.filter((b) => b.status === "critical").length;
  const activeVehicles = vehicles.filter(
    (v) => v.status === "collecting" || v.status === "available"
  ).length;
  const totalCollectedKg = vehicles
    .filter(v => v.status !== "maintenance" && v.status !== "offline")
    .reduce((sum, v) => sum + v.current_load_kg, 0);
  const totalCollectedTons = (totalCollectedKg / 1000).toFixed(1);

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
      value: `${totalCollectedTons}t`,
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
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/50">{kpi.icon}</div>
            </div>

            <div className="mt-4 flex items-center gap-1.5">
              {kpi.trend > 0 ? (
                <TrendingUp className="h-3.5 w-3.5 text-green-500" />
              ) : kpi.trend < 0 ? (
                <TrendingDown className="h-3.5 w-3.5 text-red-500" />
              ) : null}
              <span
                className={`text-xs font-medium ${
                  kpi.trend > 0
                    ? "text-green-500"
                    : kpi.trend < 0
                    ? "text-red-500"
                    : "text-muted-foreground"
                }`}
              >
                {kpi.trend !== 0
                  ? `${kpi.trend > 0 ? "+" : ""}${kpi.trend}%`
                  : "—"}{" "}
                {kpi.trendLabel}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
