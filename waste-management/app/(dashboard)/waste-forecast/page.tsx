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
    <div className="space-y-6 pb-12">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-md font-semibold">
              SUPERVISOR PLANNING & FORECASTING
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-1">
            AI Location-Wise Waste Generation Forecast
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Predict what type of waste, how much waste, and when waste will be generated across Ahmedabad industrial & commercial clusters.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Demo Data Banner */}
      <DemoDataBanner />

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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            Ahmedabad Location Hotspot Generation Map
          </h3>
          <span className="text-xs text-slate-400">Click any source marker for right-side supervisor planning</span>
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
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            AI Collection & Vehicle Dispatch Recommendations
          </h3>
          <span className="text-xs text-slate-400">Supervisor Approval Required</span>
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
  );
}
