"use client";

import {
  Trash2,
  AlertTriangle,
  Truck,
  Weight,
  TrendingUp,
  TrendingDown,
  Leaf,
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
  pulse?: boolean;
}

// CO₂ offset factors per kg recycled (kg CO₂ saved per kg material)
const CO2_FACTORS: Record<string, number> = {
  Plastic: 1.5,
  Metal: 9.0,
  Paper: 1.0,
  Glass: 0.3,
  Organic: 0.5,
  "E-Waste": 2.0,
  Other: 0.2,
};

export function KPICards() {
  const { bins, vehicles } = useAppData();

  const criticalCount = bins.filter((b) => b.status === "critical").length;
  const activeVehicles = vehicles.filter(
    (v) => v.status === "collecting" || v.status === "available"
  ).length;
  const totalCollectedKg = vehicles
    .filter(v => v.status !== "maintenance" && v.status !== "offline")
    .reduce((sum, v) => sum + (v.current_load_kg || 0), 0);
  const totalCollectedTons = (totalCollectedKg / 1000).toFixed(1);

  // CO₂ prevented: estimate from current bin composition × 92% collection efficiency
  const co2Prevented = bins.reduce((sum, bin) => {
    const factor = CO2_FACTORS[bin.waste_type] ?? 0.5;
    const collectedKg = (bin.current_fill_kg || 0) * 0.92;
    return sum + collectedKg * factor;
  }, 0);

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
      pulse: criticalCount > 0,
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
      subtitle: "Today's vehicle payloads",
      trend: 4.2,
      trendLabel: "vs yesterday",
      icon: <Weight className="h-5 w-5 text-brand" />,
    },
    {
      label: "CO₂ Prevented",
      value: `${(co2Prevented / 1000).toFixed(2)}t`,
      subtitle: "Estimated carbon offset today",
      trend: 6.8,
      trendLabel: "vs last week",
      icon: <Leaf className="h-5 w-5 text-green-600" />,
      accent: "text-green-600",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="relative overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {kpi.label}
                </p>
                <p className={`text-3xl font-bold tracking-tight ${kpi.accent || "text-foreground"} ${kpi.pulse ? "animate-pulse" : ""}`}>
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
