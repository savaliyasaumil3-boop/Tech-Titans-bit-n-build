"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DemoDataBanner } from "@/components/waste-forecasting/DemoDataBanner";
import { SourceDetailsPanel } from "@/components/waste-forecasting/SourceDetailsPanel";

const WasteSourceMap = dynamic(
  () => import("@/components/waste-forecasting/WasteSourceMap").then((m) => m.WasteSourceMap),
  { ssr: false }
);
import { fetchWasteHotspots, fetchWasteSourceById } from "@/lib/services/forecasting-api";
import type { WasteHotspot, DbWasteSource, DbWasteForecast } from "@/lib/db-types";
import { Layers, Clock, Calendar, RefreshCw, Sparkles, Filter } from "lucide-react";

import { Header } from "@/components/layout/header";

export default function SupervisorWasteHotspotsPage() {
  const [hotspots, setHotspots] = useState<WasteHotspot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHour, setSelectedHour] = useState(14); // 2 PM peak default
  const [selectedDate, setSelectedDate] = useState("2026-09-21");

  const [activeSource, setActiveSource] = useState<DbWasteSource | null>(null);
  const [activeForecast, setActiveForecast] = useState<DbWasteForecast | null>(null);

  const loadHotspots = async () => {
    setLoading(true);
    const data = await fetchWasteHotspots(selectedDate, selectedHour);
    setHotspots(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHotspots();
  }, [selectedHour, selectedDate]);

  const handleSelectSource = async (sourceId: string) => {
    const { source, latest_forecast } = await fetchWasteSourceById(sourceId);
    if (source) {
      setActiveSource(source);
      setActiveForecast(latest_forecast);
    }
  };

  const criticalCount = hotspots.filter((h) => h.overflow_risk === "Critical").length;
  const highCount = hotspots.filter((h) => h.overflow_risk === "High").length;

  return (
    <>
      <Header
        title="Waste Generation Hotspots"
        subtitle="Spatial heatmaps and predictive time-horizon slider across Ahmedabad clusters"
      />

      <div className="space-y-6 p-6 pb-12">
        {/* Top Page Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 px-2.5 py-1 rounded-md font-semibold">
              SUPERVISOR SPATIAL HOTSPOT ANALYTICS
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadHotspots}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-xl text-xs transition shadow-xs flex items-center gap-2 font-medium cursor-pointer"
              title="Refresh hotspots"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Map Data</span>
            </button>
          </div>
        </div>

        <DemoDataBanner />

        {/* Date & Time Slider Control Card */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-bold text-foreground">Predictive Spatial Time Slider</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Target Date:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground font-mono focus:outline-none focus:border-primary"
              />
            </div>
          </div>

          {/* Time Slider Controls */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Selected Time Horizon: <strong className="font-mono text-foreground">{selectedHour}:00 {selectedHour >= 12 ? "PM" : "AM"}</strong>
              </span>
              <span className="text-muted-foreground font-mono">
                Hotspots Active: <strong className="text-red-600 dark:text-red-400">{criticalCount} Critical</strong>, <strong className="text-orange-600 dark:text-orange-400">{highCount} High</strong>
              </span>
            </div>

            <input
              type="range"
              min="6"
              max="23"
              value={selectedHour}
              onChange={(e) => setSelectedHour(parseInt(e.target.value))}
              className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />

            <div className="flex justify-between text-[10px] text-muted-foreground font-mono px-1">
              <span>06:00 AM (Morning Shift)</span>
              <span>12:00 PM (Noon Peak)</span>
              <span>04:00 PM (Shift Change)</span>
              <span>08:00 PM (Night Markets)</span>
              <span>11:00 PM (Close)</span>
            </div>
          </div>
        </div>

        {/* Map Component */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-500" />
              Predicted Spatial Hotspots for {selectedDate} at {selectedHour}:00
            </h3>
            <span className="text-xs text-muted-foreground">Click marker for supervisor dispatch planning</span>
          </div>

          <WasteSourceMap
            hotspots={hotspots}
            onSelectSource={handleSelectSource}
            height="h-[560px]"
          />
        </div>

        {/* Slide-over Right Details Panel */}
        <SourceDetailsPanel
          source={activeSource}
          forecast={activeForecast}
          onClose={() => setActiveSource(null)}
          onApproved={loadHotspots}
        />
      </div>
    </>
  );
}
