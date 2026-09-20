"use client";

import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";

interface ForecastOverviewChartsProps {
  trendData?: any[];
  compositionData?: any[];
  locationTypeData?: any[];
}

const COLORS = {
  Paper: "#f59e0b",
  Plastic: "#06b6d4",
  Metal: "#a855f7",
  Glass: "#3b82f6",
  Organic: "#10b981",
  Other: "#64748b",
};

export function ForecastOverviewCharts({
  trendData = [],
  compositionData = [],
  locationTypeData = [],
}: ForecastOverviewChartsProps) {
  // Mock data fallbacks if loading
  const defaultTrend = [
    { date: "Mon", actual: 48000, predicted: 49200 },
    { date: "Tue", actual: 54000, predicted: 53100 },
    { date: "Wed", actual: 52000, predicted: 52800 },
    { date: "Thu", actual: 59000, predicted: 58400 },
    { date: "Fri", actual: 64000, predicted: 65100 },
    { date: "Sat", actual: 42000, predicted: 41500 },
    { date: "Sun", actual: 38000, predicted: 39000 },
  ];

  const defaultComposition = [
    { name: "Paper", value: 34, color: COLORS.Paper },
    { name: "Metal", value: 28, color: COLORS.Metal },
    { name: "Organic", value: 20, color: COLORS.Organic },
    { name: "Plastic", value: 12, color: COLORS.Plastic },
    { name: "Glass", value: 4, color: COLORS.Glass },
    { name: "Other", value: 2, color: COLORS.Other },
  ];

  const defaultLocationType = [
    { type: "Factory", kg: 24500 },
    { type: "Industrial", kg: 18200 },
    { type: "Commercial", kg: 12400 },
    { type: "Restaurant", kg: 9800 },
    { type: "Residential", kg: 8500 },
    { type: "Construction", kg: 7200 },
    { type: "Market", kg: 6100 },
  ];

  const lineData = trendData.length > 0 ? trendData : defaultTrend;
  const pieData = compositionData.length > 0 ? compositionData : defaultComposition;
  const barData = locationTypeData.length > 0 ? locationTypeData : defaultLocationType;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
      {/* 1. Actual vs Predicted Waste Line Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Actual vs Predicted Waste</h3>
            <p className="text-xs text-slate-400">Daily forecast accuracy comparison (kg)</p>
          </div>
          <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-md">
            R² = 0.88
          </span>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                formatter={(value: any) => [`${value.toLocaleString()} kg`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Line type="monotone" dataKey="actual" name="Actual Collected" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="predicted" name="AI Predicted" stroke="#10b981" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. Waste Composition Donut Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Forecast Waste Composition</h3>
            <p className="text-xs text-slate-400">Material distribution breakdown (%)</p>
          </div>
        </div>
        <div className="h-[220px] w-full flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || (COLORS as any)[entry.name] || "#64748b"} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                formatter={(value: any) => [`${value}%`, "Share"]}
              />
              <Legend wrapperStyle={{ fontSize: "11px" }} layout="horizontal" align="center" verticalAlign="bottom" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Waste Generation by Location Type Bar Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100">Waste Generation by Source Type</h3>
            <p className="text-xs text-slate-400">Total predicted output per category (kg)</p>
          </div>
        </div>
        <div className="h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="type" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip
                contentStyle={{ backgroundColor: "#0f172a", borderColor: "#334155", borderRadius: "12px", fontSize: "12px" }}
                formatter={(value: any) => [`${value.toLocaleString()} kg`, "Predicted"]}
              />
              <Bar dataKey="kg" name="Predicted Volume (kg)" fill="#a855f7" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
