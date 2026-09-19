"use client";

import { Html } from "@react-three/drei";
import { Badge } from "@/components/ui/badge";
import { Radio, Zap } from "lucide-react";

interface SmartBinLabelProps {
  binId: string;
  fillLevel: number;
  status: "healthy" | "warning" | "critical";
  wasteType: string;
  binHeight?: number;
}

export function SmartBinLabel({
  binId,
  fillLevel,
  status,
  wasteType,
  binHeight = 1.1,
}: SmartBinLabelProps) {
  const isCritical = status === "critical";
  const isWarning = status === "warning";

  const badgeVariant = isCritical
    ? "destructive"
    : isWarning
    ? "secondary"
    : "outline";

  return (
    <Html
      position={[0, binHeight + 0.35, 0]}
      center
      distanceFactor={8}
      zIndexRange={[10, 0]}
    >
      <div className="flex flex-col items-center gap-1 cursor-default pointer-events-none select-none">
        {/* Main Floating 3D Badge */}
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-md shadow-lg border transition-all ${
            isCritical
              ? "bg-red-500/90 text-white border-red-400 animate-bounce"
              : isWarning
              ? "bg-amber-500/90 text-white border-amber-400"
              : "bg-black/85 text-white border-white/20"
          }`}
        >
          <Radio className="h-3.5 w-3.5 animate-pulse text-green-400 shrink-0" />
          <span className="font-bold text-xs tracking-wide">{binId}</span>
          <span className="text-[10px] opacity-75">•</span>
          <span className="font-extrabold text-xs tabular-nums">{fillLevel}%</span>
        </div>

        {/* Sub-label: Waste Stream & Telemetry */}
        <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm text-[10px] text-gray-200 border border-white/10">
          <Zap className="h-2.5 w-2.5 text-yellow-400" />
          <span>{wasteType}</span>
          <span className="opacity-50">|</span>
          <span className="text-gray-300">{Math.round((1 - fillLevel / 100) * 110)} cm dist</span>
        </div>
      </div>
    </Html>
  );
}
