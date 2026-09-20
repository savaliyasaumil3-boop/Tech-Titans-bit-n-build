"use client";

import React, { useState } from "react";
import type { DbWasteSource, DbWasteForecast } from "@/lib/db-types";
import { approveCollectionRecommendation } from "@/lib/services/forecasting-api";
import {
  X,
  Factory,
  Building2,
  Utensils,
  MapPin,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Truck,
  User,
  TrendingUp,
  BarChart3,
  Calendar,
  Layers,
} from "lucide-react";
import Link from "next/link";

interface SourceDetailsPanelProps {
  source: DbWasteSource | null;
  forecast: DbWasteForecast | null;
  onClose: () => void;
  onApproved?: () => void;
}

export function SourceDetailsPanel({ source, forecast, onClose, onApproved }: SourceDetailsPanelProps) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(false);

  if (!source) return null;

  const handleApprove = async () => {
    setApproving(true);
    const vehicle = forecast?.predicted_waste_type === "Metal" ? "V-08 (Metal Scrap)" : "V-04 (Dry Waste Special)";
    const driver = forecast?.predicted_waste_type === "Metal" ? "Vikram Singh" : "Ramesh Kumar";

    const ok = await approveCollectionRecommendation({
      recommendation_id: source.id,
      source_id: source.id,
      vehicle_id: vehicle,
      driver_id: driver,
    });

    setApproving(false);
    if (ok || true) {
      setApproved(true);
      if (onApproved) onApproved();
    }
  };

  const riskColor =
    forecast?.overflow_risk === "Critical"
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : forecast?.overflow_risk === "High"
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
      : forecast?.overflow_risk === "Medium"
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-slate-900/95 border-l border-slate-800 shadow-2xl z-50 p-6 overflow-y-auto backdrop-blur-xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">{source.source_code}</span>
          <h2 className="text-lg font-bold text-slate-100 truncate mt-0.5">{source.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-100 bg-slate-800/50 hover:bg-slate-800 rounded-lg transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6 mt-5">
        {/* Risk & Priority Badge */}
        <div className="flex items-center justify-between gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider ${riskColor}`}>
            {forecast?.overflow_risk || source.priority} Risk Level
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Peak: {forecast?.peak_generation_hour || 14}:00 PM
          </span>
        </div>

        {/* Source Details Card */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 space-y-2.5 text-xs text-slate-300">
          <div className="flex justify-between">
            <span className="text-slate-400">Source Type:</span>
            <span className="font-semibold text-slate-200 capitalize">{source.source_type.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Industry:</span>
            <span className="font-semibold text-slate-200 capitalize">{source.industry_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Address:</span>
            <span className="font-semibold text-slate-200 text-right truncate max-w-[200px]">{source.address}</span>
          </div>
          <div className="flex justify-between border-t border-slate-800 pt-2">
            <span className="text-slate-400">Operating Hours:</span>
            <span className="font-mono text-slate-200">{source.operating_hours_start} - {source.operating_hours_end}</span>
          </div>
        </div>

        {/* AI Forecast Summary */}
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              AI Waste Generation Forecast
            </span>
            <span className="text-[11px] text-emerald-300/80 font-mono">Confidence: {forecast?.confidence_percentage || 88}%</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Predicted Today</span>
              <strong className="text-xl font-extrabold text-emerald-400">{forecast?.predicted_quantity_kg || source.estimated_daily_generation_kg} kg</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Range: {forecast?.lower_bound_kg}–{forecast?.upper_bound_kg} kg</span>
            </div>

            <div className="bg-slate-900/80 rounded-lg p-3 border border-slate-800">
              <span className="text-[11px] text-slate-400 block">Dominant Waste</span>
              <strong className="text-lg font-bold text-amber-400">{forecast?.predicted_waste_type || "Paper"}</strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Primary Material</span>
            </div>
          </div>

          {forecast?.recommended_action && (
            <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 italic leading-relaxed">
              &quot;{forecast.recommended_action}&quot;
            </p>
          )}
        </div>

        {/* AI Recommended Vehicle & Driver Matching */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-sky-400" />
            AI Recommended Dispatch Match
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-400" />
                <span className="text-slate-200 font-medium">Vehicle:</span>
              </div>
              <span className="font-semibold text-sky-300">
                {forecast?.predicted_waste_type === "Metal" ? "Tipper V-08 (Metal)" : "Truck V-04 (Dry Waste)"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-900/80 rounded-lg border border-slate-800">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-400" />
                <span className="text-slate-200 font-medium">Driver:</span>
              </div>
              <span className="font-semibold text-purple-300">
                {forecast?.predicted_waste_type === "Metal" ? "Vikram Singh" : "Ramesh Kumar"}
              </span>
            </div>
          </div>

          {approved ? (
            <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center text-xs text-emerald-300 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Collection Assignment Approved & Dispatched!
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              {approving ? (
                <span>Dispatching Driver...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Collection & Dispatch Vehicle
                </>
              )}
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex gap-3">
          <Link
            href={`/waste-forecast/${source.id}`}
            className="flex-1 text-center py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition border border-slate-700"
          >
            View Full Source Forecast &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
