"use client";

import React, { useState } from "react";
import type { DbWasteForecast } from "@/lib/db-types";
import { Search, Filter, ArrowUpDown, ChevronRight, AlertTriangle, CheckCircle2, Factory, Building2, Utensils } from "lucide-react";
import Link from "next/link";

interface LocationForecastTableProps {
  forecasts: DbWasteForecast[];
  onSelectSource: (sourceId: string) => void;
}

export function LocationForecastTable({ forecasts, onSelectSource }: LocationForecastTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [sortBy, setSortBy] = useState<"quantity" | "risk" | "name">("quantity");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter logic
  const filtered = forecasts.filter((fc) => {
    const matchesSearch =
      (fc.source_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fc.source_code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (fc.source_id || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSourceType = sourceTypeFilter === "all" || fc.source_type === sourceTypeFilter;
    const matchesWasteType = wasteTypeFilter === "all" || fc.predicted_waste_type === wasteTypeFilter;
    const matchesRisk = riskFilter === "all" || (fc.overflow_risk || "").toLowerCase() === riskFilter.toLowerCase();

    return matchesSearch && matchesSourceType && matchesWasteType && matchesRisk;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "quantity") {
      return sortOrder === "desc"
        ? b.predicted_quantity_kg - a.predicted_quantity_kg
        : a.predicted_quantity_kg - b.predicted_quantity_kg;
    }
    if (sortBy === "risk") {
      const riskWeight = { Critical: 4, High: 3, Medium: 2, Low: 1 };
      const rA = (riskWeight as any)[a.overflow_risk] || 0;
      const rB = (riskWeight as any)[b.overflow_risk] || 0;
      return sortOrder === "desc" ? rB - rA : rA - rB;
    }
    return sortOrder === "desc"
      ? (b.source_name || "").localeCompare(a.source_name || "")
      : (a.source_name || "").localeCompare(b.source_name || "");
  });

  const toggleSort = (field: "quantity" | "risk" | "name") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-100">Location Waste Forecast Directory</h3>
          <p className="text-xs text-slate-400">100 Active Waste Sources & ML Operational Predictions</p>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search source name, code, area..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Multi-Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-800/80">
        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Source Type</label>
          <select
            value={sourceTypeFilter}
            onChange={(e) => setSourceTypeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Source Types</option>
            <option value="factory">Factory / Manufacturing</option>
            <option value="industrial_area">Industrial Estate</option>
            <option value="commercial">Commercial Hub</option>
            <option value="restaurant">Restaurant Zone</option>
            <option value="residential">Residential Township</option>
            <option value="market">Wholesale Market</option>
            <option value="construction">Construction Site</option>
            <option value="warehouse">Warehouse & Logistics</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Dominant Waste Type</label>
          <select
            value={wasteTypeFilter}
            onChange={(e) => setWasteTypeFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Waste Materials</option>
            <option value="Paper">Paper & Cardboard</option>
            <option value="Metal">Metal Scrap</option>
            <option value="Organic">Organic & Wet Waste</option>
            <option value="Plastic">Plastic & Polymers</option>
            <option value="Glass">Glass Containers</option>
          </select>
        </div>

        <div>
          <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">Overflow Risk Level</label>
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical (&gt; 1500 kg)</option>
            <option value="high">High (800–1500 kg)</option>
            <option value="medium">Medium (400–800 kg)</option>
            <option value="low">Low (&lt; 400 kg)</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-3 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("name")}>
                <div className="flex items-center gap-1">
                  Source Location <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Type / Industry</th>
              <th className="py-3 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("quantity")}>
                <div className="flex items-center gap-1">
                  Predicted Today <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Dominant Waste</th>
              <th className="py-3 px-4">Peak Generation</th>
              <th className="py-3 px-4 cursor-pointer hover:text-slate-200" onClick={() => toggleSort("risk")}>
                <div className="flex items-center gap-1">
                  Overflow Risk <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4 text-right">Supervisor Action</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No waste sources match the selected filter criteria.
                </td>
              </tr>
            ) : (
              sorted.slice(0, 30).map((fc) => (
                <tr key={fc.source_id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <strong className="text-slate-100 font-semibold">{fc.source_name}</strong>
                      <span className="text-[10px] font-mono text-emerald-400">{fc.source_code}</span>
                    </div>
                  </td>

                  <td className="py-3 px-4 capitalize text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px]">
                      {(fc.source_type || "Commercial").replace("_", " ")}
                    </span>
                  </td>

                  <td className="py-3 px-4 font-mono font-extrabold text-emerald-400 text-sm">
                    {fc.predicted_quantity_kg} kg
                  </td>

                  <td className="py-3 px-4">
                    <span className="font-bold text-amber-400">{fc.predicted_waste_type}</span>
                  </td>

                  <td className="py-3 px-4 font-mono text-slate-300">
                    {fc.peak_generation_hour}:00 PM
                  </td>

                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border ${getRiskBadge(fc.overflow_risk)}`}>
                      {fc.overflow_risk}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectSource(fc.source_id)}
                      className="px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white font-semibold rounded-lg text-[11px] transition shadow-md shadow-emerald-600/20 inline-flex items-center gap-1"
                    >
                      Inspect & Plan <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
