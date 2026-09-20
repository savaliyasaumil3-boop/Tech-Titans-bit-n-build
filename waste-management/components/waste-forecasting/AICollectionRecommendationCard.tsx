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
      ? "bg-red-500/20 text-red-400 border-red-500/30"
      : recommendation.overflow_risk === "High"
      ? "bg-orange-500/20 text-orange-400 border-orange-500/30"
      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-slate-700 transition space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-emerald-400">{recommendation.source_code}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${riskBadgeColor}`}>
              {recommendation.overflow_risk} Risk
            </span>
          </div>
          <h3 className="text-base font-bold text-slate-100 mt-1">{recommendation.source_name}</h3>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Predicted Waste</span>
          <span className="text-lg font-extrabold text-emerald-400">{recommendation.predicted_quantity_kg} kg</span>
          <span className="text-[11px] text-amber-400 block font-medium">{recommendation.predicted_waste_type}</span>
        </div>
      </div>

      {/* AI Reasoning */}
      <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 text-xs text-slate-300 leading-relaxed flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p>{recommendation.reasoning}</p>
      </div>

      {/* Vehicle & Driver Matching */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/20 text-sky-400 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-slate-400 block text-[10px]">Matched Vehicle</span>
            <span className="font-semibold text-slate-200 truncate block">{recommendation.recommended_vehicle}</span>
          </div>
        </div>

        <div className="bg-slate-950/50 p-2.5 rounded-xl border border-slate-800 flex items-center gap-2.5">
          <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
            <User className="w-4 h-4" />
          </div>
          <div className="truncate">
            <span className="text-slate-400 block text-[10px]">Assigned Driver</span>
            <span className="font-semibold text-slate-200 truncate block">{recommendation.recommended_driver}</span>
          </div>
        </div>
      </div>

      {/* Approval Trigger */}
      <div className="pt-1 flex items-center justify-between gap-4">
        <span className="text-xs text-slate-400 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          Target Time: <strong className="text-slate-200 font-mono">{recommendation.recommended_time}</strong>
        </span>

        {approved ? (
          <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Approved & Dispatched
          </span>
        ) : (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs shadow-lg shadow-emerald-600/20 transition flex items-center gap-2"
          >
            {approving ? "Dispatching..." : "Approve Collection"}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
