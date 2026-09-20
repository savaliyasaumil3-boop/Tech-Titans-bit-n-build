"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWasteSourceById } from "@/lib/services/forecasting-api";
import type { DbWasteSource, DbWasteForecast } from "@/lib/db-types";
import { DemoDataBanner } from "@/components/waste-forecasting/DemoDataBanner";
import { ArrowLeft, Factory, MapPin, Clock, TrendingUp, ShieldAlert, BarChart3, Truck, Calendar } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export function SourceForecastDetailPage() {
  const params = useParams();
  const sourceId = params?.sourceId as string;

  const [source, setSource] = useState<DbWasteSource | null>(null);
  const [forecast, setForecast] = useState<DbWasteForecast | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sourceId) {
      fetchWasteSourceById(sourceId).then(({ source, latest_forecast }) => {
        setSource(source);
        setForecast(latest_forecast);
        setLoading(false);
      });
    }
  }, [sourceId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p>Loading Waste Source Profile & Historical Forecasts...</p>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-12 text-center text-slate-400 space-y-4">
        <h2 className="text-xl font-bold text-slate-200">Waste Source Not Found</h2>
        <Link href="/waste-forecast" className="text-emerald-400 text-xs hover:underline">
          &larr; Back to Waste Forecast Directory
        </Link>
      </div>
    );
  }

  const history7d = [
    { date: "Mon", kg: Math.round(source.estimated_daily_generation_kg * 1.1) },
    { date: "Tue", kg: Math.round(source.estimated_daily_generation_kg * 0.95) },
    { date: "Wed", kg: Math.round(source.estimated_daily_generation_kg * 1.05) },
    { date: "Thu", kg: Math.round(source.estimated_daily_generation_kg * 1.15) },
    { date: "Fri", kg: Math.round(source.estimated_daily_generation_kg * 1.2) },
    { date: "Sat", kg: Math.round(source.estimated_daily_generation_kg * 0.4) },
    { date: "Sun", kg: Math.round(source.estimated_daily_generation_kg * 0.3) },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/waste-forecast"
          className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl text-xs transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <div>
          <span className="text-xs font-mono text-emerald-400">{source.source_code}</span>
          <h1 className="text-2xl font-extrabold text-slate-100">{source.name}</h1>
          <p className="text-xs text-slate-400">{source.address}</p>
        </div>
      </div>

      <DemoDataBanner />

      {/* Main Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Factory className="w-4 h-4 text-emerald-400" />
            Source Profile Metadata
          </h3>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Source Type:</span>
              <strong className="text-slate-100 capitalize">{source.source_type.replace("_", " ")}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Industry:</span>
              <strong className="text-slate-100 capitalize">{source.industry_type}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Expected Waste Types:</span>
              <strong className="text-amber-400">{source.expected_waste_types.join(", ")}</strong>
            </div>
            <div className="flex justify-between border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">Operating Hours:</span>
              <span className="font-mono text-slate-200">{source.operating_hours_start} - {source.operating_hours_end}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Baseline Daily Estimate:</span>
              <strong className="text-emerald-400">{source.estimated_daily_generation_kg} kg</strong>
            </div>
          </div>
        </div>

        {/* 7-Day History Chart */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-100">7-Day Waste Generation History</h3>
              <p className="text-xs text-slate-400">Historical records per day (kg)</p>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md">
              Peak: {forecast?.peak_generation_hour || 14}:00 PM
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history7d}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(val: any) => [`${val} kg`, "Generated"]}
                />
                <Line type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SourceForecastDetailPage;
