"use client";

import React from "react";
import { Factory, TrendingUp, AlertTriangle, Scale, Truck, ShieldAlert, FileText, Wrench, Leaf } from "lucide-react";

interface WasteForecastKPIsProps {
  totalSources: number;
  totalPredictedKg: number;
  highRiskCount: number;
  paperKg: number;
  metalKg: number;
  organicKg: number;
  vehiclesRequired: number;
}

export function WasteForecastKPIs({
  totalSources,
  totalPredictedKg,
  highRiskCount,
  paperKg,
  metalKg,
  organicKg,
  vehiclesRequired,
}: WasteForecastKPIsProps) {
  const kpis = [
    {
      label: "Total Waste Sources",
      value: totalSources.toLocaleString(),
      subtitle: "Ahmedabad Industrial & Commercial",
      icon: Factory,
      color: "text-sky-400 bg-sky-500/10 border-sky-500/30",
    },
    {
      label: "Predicted Waste Today",
      value: `${(totalPredictedKg / 1000).toFixed(1)} Tons`,
      subtitle: `${totalPredictedKg.toLocaleString()} kg total generation`,
      icon: TrendingUp,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    },
    {
      label: "High & Critical Risk Sources",
      value: highRiskCount.toString(),
      subtitle: "Requires priority collection today",
      icon: ShieldAlert,
      color: "text-red-400 bg-red-500/10 border-red-500/30",
    },
    {
      label: "Predicted Paper / Fiber",
      value: `${paperKg.toLocaleString()} kg`,
      subtitle: "Paper mills & commercial packing",
      icon: FileText,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
    },
    {
      label: "Predicted Metal Scrap",
      value: `${metalKg.toLocaleString()} kg`,
      subtitle: "Foundries, engineering & scrap",
      icon: Wrench,
      color: "text-purple-400 bg-purple-500/10 border-purple-500/30",
    },
    {
      label: "Predicted Organic Waste",
      value: `${organicKg.toLocaleString()} kg`,
      subtitle: "Markets, restaurants & residential",
      icon: Leaf,
      color: "text-green-400 bg-green-500/10 border-green-500/30",
    },
    {
      label: "Vehicles Required",
      value: `${vehiclesRequired} Fleet Units`,
      subtitle: "Matched to waste material type",
      icon: Truck,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-6">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl hover:border-slate-700 transition flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-medium text-slate-400 truncate">{kpi.label}</span>
              <div className={`p-2 rounded-xl border ${kpi.color}`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-xl font-extrabold text-slate-100 tracking-tight block">{kpi.value}</span>
              <span className="text-[10px] text-slate-500 mt-1 block truncate">{kpi.subtitle}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
