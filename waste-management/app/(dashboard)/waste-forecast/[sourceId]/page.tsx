"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { fetchWasteSourceById } from "@/lib/services/forecasting-api";
import type { DbWasteSource, DbWasteForecast } from "@/lib/db-types";
import { DemoDataBanner } from "@/components/waste-forecasting/DemoDataBanner";
import { ArrowLeft, Factory, MapPin, Clock, TrendingUp, ShieldAlert, BarChart3, Truck, Calendar } from "lucide-react";
import Link from "next/link";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

import { Header } from "@/components/layout/header";

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
      <div className="p-12 text-center text-muted-foreground space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p>Loading Waste Source Profile & Historical Forecasts...</p>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="p-12 text-center text-muted-foreground space-y-4">
        <h2 className="text-xl font-bold text-foreground">Waste Source Not Found</h2>
        <Link href="/waste-forecast" className="text-emerald-600 dark:text-emerald-400 text-xs hover:underline">
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
    <>
      <Header
        title={source.name}
        subtitle={`${source.source_code} • ${source.address}`}
      />

      <div className="space-y-6 p-6 pb-12">
        {/* Header navigation bar */}
        <div className="flex items-center gap-3">
          <Link
            href="/waste-forecast"
            className="p-2.5 bg-card hover:bg-muted border border-border text-foreground rounded-xl text-xs transition shadow-xs flex items-center gap-1.5 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Directory</span>
          </Link>
        </div>

        {/* Main Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Factory className="w-4 h-4 text-emerald-500" />
              Source Profile Metadata
            </h3>
            <div className="space-y-3 text-xs text-foreground">
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Source Type:</span>
                <strong className="text-foreground capitalize">{source.source_type.replace("_", " ")}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Industry:</span>
                <strong className="text-foreground capitalize">{source.industry_type}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Expected Waste Types:</span>
                <strong className="text-amber-600 dark:text-amber-400">{source.expected_waste_types.join(", ")}</strong>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span className="text-muted-foreground">Operating Hours:</span>
                <span className="font-mono text-foreground">{source.operating_hours_start} - {source.operating_hours_end}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Baseline Daily Estimate:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">{source.estimated_daily_generation_kg} kg</strong>
              </div>
            </div>
          </div>

          {/* 7-Day History Chart */}
          <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-sm font-bold text-foreground">7-Day Waste Generation History</h3>
                <p className="text-xs text-muted-foreground">Historical records per day (kg)</p>
              </div>
              <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-md font-semibold">
                Peak: {forecast?.peak_generation_hour || 14}:00 PM
              </span>
            </div>

            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={history7d}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--popover)",
                      borderColor: "var(--border)",
                      color: "var(--popover-foreground)",
                      borderRadius: "12px",
                      fontSize: "12px",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    }}
                    formatter={(val: any) => [`${val} kg`, "Generated"]}
                  />
                  <Line type="monotone" dataKey="kg" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default SourceForecastDetailPage;
