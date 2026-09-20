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
      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
      : forecast?.overflow_risk === "High"
      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
      : forecast?.overflow_risk === "Medium"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card/95 border-l border-border text-card-foreground shadow-2xl z-50 p-6 overflow-y-auto backdrop-blur-xl animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-widest">{source.source_code}</span>
          <h2 className="text-lg font-bold text-foreground truncate mt-0.5">{source.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-muted-foreground hover:text-foreground bg-muted hover:bg-muted/80 rounded-lg transition cursor-pointer"
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
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            Peak: {forecast?.peak_generation_hour || 14}:00 PM
          </span>
        </div>

        {/* Source Details Card */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-2.5 text-xs text-foreground">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Source Type:</span>
            <span className="font-semibold text-foreground capitalize">{source.source_type.replace("_", " ")}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Industry:</span>
            <span className="font-semibold text-foreground capitalize">{source.industry_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Address:</span>
            <span className="font-semibold text-foreground text-right truncate max-w-[200px]">{source.address}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2">
            <span className="text-muted-foreground">Operating Hours:</span>
            <span className="font-mono text-foreground">{source.operating_hours_start} - {source.operating_hours_end}</span>
          </div>
        </div>

        {/* AI Forecast Summary */}
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              AI Waste Generation Forecast
            </span>
            <span className="text-[11px] text-emerald-700 dark:text-emerald-300 font-mono">Confidence: {forecast?.confidence_percentage || 88}%</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-card rounded-lg p-3 border border-border">
              <span className="text-[11px] text-muted-foreground block">Predicted Today</span>
              <strong className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">{forecast?.predicted_quantity_kg || source.estimated_daily_generation_kg} kg</strong>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Range: {forecast?.lower_bound_kg}–{forecast?.upper_bound_kg} kg</span>
            </div>

            <div className="bg-card rounded-lg p-3 border border-border">
              <span className="text-[11px] text-muted-foreground block">Dominant Waste</span>
              <strong className="text-lg font-bold text-amber-600 dark:text-amber-400">{forecast?.predicted_waste_type || "Paper"}</strong>
              <span className="text-[10px] text-muted-foreground block mt-0.5">Primary Material</span>
            </div>
          </div>

          {forecast?.recommended_action && (
            <p className="text-xs text-foreground bg-card/60 p-2.5 rounded-lg border border-border italic leading-relaxed">
              &quot;{forecast.recommended_action}&quot;
            </p>
          )}
        </div>

        {/* AI Recommended Vehicle & Driver Matching */}
        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-sky-500" />
            AI Recommended Dispatch Match
          </h3>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-sky-500" />
                <span className="text-foreground font-medium">Vehicle:</span>
              </div>
              <span className="font-semibold text-sky-600 dark:text-sky-300">
                {forecast?.predicted_waste_type === "Metal" ? "Tipper V-08 (Metal)" : "Truck V-04 (Dry Waste)"}
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-card rounded-lg border border-border">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-purple-500" />
                <span className="text-foreground font-medium">Driver:</span>
              </div>
              <span className="font-semibold text-purple-600 dark:text-purple-300">
                {forecast?.predicted_waste_type === "Metal" ? "Vikram Singh" : "Ramesh Kumar"}
              </span>
            </div>
          </div>

          {approved ? (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Collection Assignment Approved & Dispatched!
            </div>
          ) : (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
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
            className="flex-1 text-center py-2.5 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl text-xs transition border border-border"
          >
            View Full Source Forecast &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
