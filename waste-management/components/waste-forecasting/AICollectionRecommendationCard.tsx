"use client";

import React, { useState } from "react";
import type { AICollectionRecommendation } from "@/lib/db-types";
import { approveCollectionRecommendation } from "@/lib/services/forecasting-api";
import { Truck, User, Clock, AlertTriangle, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";

interface AICollectionRecommendationCardProps {
  recommendation: AICollectionRecommendation;
  onApproved?: () => void;
}

export function AICollectionRecommendationCard({
  recommendation,
  onApproved,
}: AICollectionRecommendationCardProps) {
  const [approving, setApproving] = useState(false);
  const [approved, setApproved] = useState(recommendation.status === "approved");

  const handleApprove = async () => {
    setApproving(true);
    const ok = await approveCollectionRecommendation({
      recommendation_id: recommendation.id,
      source_id: recommendation.source_id,
      vehicle_id: recommendation.recommended_vehicle,
      driver_id: recommendation.recommended_driver,
    });
    setApproving(false);
    setApproved(true);
    if (onApproved) onApproved();
  };

  const riskBadgeColor =
    recommendation.overflow_risk === "Critical"
      ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30"
      : recommendation.overflow_risk === "High"
      ? "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30"
      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:border-primary/40 transition space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">{recommendation.source_code}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${riskBadgeColor}`}>
              {recommendation.overflow_risk} Risk
            </span>
          </div>
          <h3 className="text-base font-bold text-foreground mt-1">{recommendation.source_name}</h3>
        </div>

        <div className="text-right">
          <span className="text-xs text-muted-foreground block">Predicted Waste</span>
          <span className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">{recommendation.predicted_quantity_kg} kg</span>
          <span className="text-[11px] text-amber-600 dark:text-amber-400 block font-medium">{recommendation.predicted_waste_type}</span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="bg-muted/50 p-3 rounded-xl border border-border text-xs text-foreground leading-relaxed flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <p>{recommendation.reasoning}</p>
      </div>

      {/* Vehicle & Driver Matching */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-muted/30 p-2.5 rounded-xl border border-border flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/15 text-sky-600 dark:text-sky-400 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-muted-foreground block text-[10px]">Matched Vehicle</span>
            <span className="font-semibold text-foreground truncate block">{recommendation.recommended_vehicle}</span>
          </div>
        </div>

        <div className="bg-muted/30 p-2.5 rounded-xl border border-border flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/15 text-purple-600 dark:text-purple-400 rounded-lg">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-muted-foreground block text-[10px]">Assigned Driver</span>
            <span className="font-semibold text-foreground truncate block">{recommendation.recommended_driver}</span>
          </div>
        </div>
      </div>

      {/* Approval Trigger */}
      <div className="pt-1 flex items-center justify-between gap-4">
        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
          Target Time: <strong className="text-foreground font-mono">{recommendation.recommended_time}</strong>
        </span>

        {approved ? (
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Approved & Dispatched
          </span>
        ) : (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2 cursor-pointer"
          >
            {approving ? "Dispatching..." : "Approve Collection"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
