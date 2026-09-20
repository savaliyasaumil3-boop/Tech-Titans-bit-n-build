"use client";

import React from "react";
import { Info, Database, Sparkles } from "lucide-react";

export function DemoDataBanner() {
  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 text-amber-200 text-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <span className="font-semibold text-amber-300 uppercase tracking-wider text-xs block">
            DEMO DATA / SIMULATED HISTORICAL RECORDS
          </span>
          <p className="text-amber-200/90 text-xs mt-0.5">
            This workspace utilizes 100 realistic waste source clusters in Ahmedabad (Paper/Metal factories, commercial zones & residential areas) seeded with 90-day time-series data for ML model training.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs font-mono bg-amber-500/20 px-3 py-1.5 rounded-lg text-amber-300 border border-amber-500/30 whitespace-nowrap self-end md:self-auto">
        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
        scikit-learn RF-v1.2 Model Active
      </div>
    </div>
  );
}
