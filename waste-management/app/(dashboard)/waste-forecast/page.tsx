"use client";

import React, { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { DemoDataBanner } from "@/components/waste-forecasting/DemoDataBanner";
import { WasteForecastKPIs } from "@/components/waste-forecasting/WasteForecastKPIs";
import { ForecastOverviewCharts } from "@/components/waste-forecasting/ForecastOverviewCharts";
import { LocationForecastTable } from "@/components/waste-forecasting/LocationForecastTable";
import { AICollectionRecommendationCard } from "@/components/waste-forecasting/AICollectionRecommendationCard";
import { SourceDetailsPanel } from "@/components/waste-forecasting/SourceDetailsPanel";
import { PredictionVsActualChart } from "@/components/waste-forecasting/PredictionVsActualChart";

const WasteSourceMap = dynamic(
  () => import("@/components/waste-forecasting/WasteSourceMap").then((m) => m.WasteSourceMap),
  { ssr: false }
);
import {
  fetchWasteSources,
  fetchAllForecasts,
  fetchAICollectionRecommendations,
  fetchModelMetrics,
  fetchWasteSourceById,
} from "@/lib/services/forecasting-api";
import type { DbWasteSource, DbWasteForecast, AICollectionRecommendation, ModelMetrics } from "@/lib/db-types";
import { Sparkles, MapPin, Truck, RefreshCw } from "lucide-react";

import { Header } from "@/components/layout/header";

export default function SupervisorWasteForecastPage() {
  const [sources, setSources] = useState<DbWasteSource[]>([]);
  const [forecasts, setForecasts] = useState<DbWasteForecast[]>([]);
  const [recommendations, setRecommendations] = useState<AICollectionRecommendation[]>([]);
  const [metrics, setMetrics] = useState<ModelMetrics>({ mae: 42.5, rmse: 68.1, r2: 0.88, trained_records: 27200, model_version: "RF-v1.2" });
  const [loading, setLoading] = useState(true);

  const [selectedSourceId, setSelectedSourceId] = useState<string | null>(null);
  const [activeSource, setActiveSource] = useState<DbWasteSource | null>(null);
  const [activeForecast, setActiveForecast] = useState<DbWasteForecast | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [srcs, fcsData, recs, m] = await Promise.all([
      fetchWasteSources(),
      fetchAllForecasts(),
      fetchAICollectionRecommendations(),
      fetchModelMetrics(),
    ]);

    setSources(srcs);
    setForecasts(fcsData.forecasts || []);
    setRecommendations(recs);
    setMetrics(m);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectSource = async (sourceId: string) => {
    setSelectedSourceId(sourceId);
    const { source, latest_forecast } = await fetchWasteSourceById(sourceId);
    if (source) {
      setActiveSource(source);
      setActiveForecast(latest_forecast);
    }
  };

  // Computations for KPIs
  const totalSources = sources.length || 100;
  const totalPredictedKg = forecasts.reduce((acc, f) => acc + f.predicted_quantity_kg, 0) || 124500;
  const highRiskCount = forecasts.filter((f) => f.overflow_risk === "High" || f.overflow_risk === "Critical").length || 32;

  const paperKg = forecasts.filter((f) => f.predicted_waste_type === "Paper").reduce((acc, f) => acc + f.predicted_quantity_kg, 0) || 42300;
  const metalKg = forecasts.filter((f) => f.predicted_waste_type === "Metal").reduce((acc, f) => acc + f.predicted_quantity_kg, 0) || 35100;
  const organicKg = forecasts.filter((f) => f.predicted_waste_type === "Organic").reduce((acc, f) => acc + f.predicted_quantity_kg, 0) || 28400;

  return (
    <>
      <Header
        title="AI Location-Wise Waste Forecast"
        subtitle="Predict material streams, quantities, and peak generation times across Ahmedabad industrial & commercial clusters"
      />

      <div className="space-y-6 p-6 pb-12">
        {/* Top Banner Control Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-md font-semibold">
              SUPERVISOR PLANNING & FORECASTING
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="px-3 py-1.5 bg-card hover:bg-muted border border-border text-foreground rounded-xl text-xs transition shadow-xs flex items-center gap-2 font-medium cursor-pointer"
              title="Refresh data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh Forecasts</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
      <WasteForecastKPIs
        totalSources={totalSources}
        totalPredictedKg={totalPredictedKg}
        highRiskCount={highRiskCount}
        paperKg={paperKg}
        metalKg={metalKg}
        organicKg={organicKg}
        vehiclesRequired={12}
      />

      {/* Interactive Map & Spatial Overview */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-500" />
            Ahmedabad Location Hotspot Generation Map
          </h3>
          <span className="text-xs text-muted-foreground">Click "View Supervisor Planning" inside marker popup to open side panel</span>
        </div>
        <WasteSourceMap
          sources={sources}
          onSelectSource={handleSelectSource}
          selectedSourceId={selectedSourceId}
          height="h-[440px]"
        />
      </div>

      {/* AI Collection Recommendations Carousel / Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-500" />
            AI Collection & Vehicle Dispatch Recommendations
          </h3>
          <span className="text-xs text-muted-foreground">Supervisor Approval Required</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recommendations.slice(0, 3).map((rec) => (
            <AICollectionRecommendationCard key={rec.id} recommendation={rec} onApproved={loadData} />
          ))}
        </div>
      </div>

      {/* Overview Analytics Charts */}
      <ForecastOverviewCharts />

      {/* Model Feedback Loop */}
      <PredictionVsActualChart metrics={metrics} />

      {/* Location Forecast Directory Table */}
      <LocationForecastTable forecasts={forecasts} onSelectSource={handleSelectSource} />

      {/* Slide-over Right Details Panel */}
      <SourceDetailsPanel
        source={activeSource}
        forecast={activeForecast}
        onClose={() => setActiveSource(null)}
        onApproved={loadData}
      />
      </div>
    </>
  );
}
