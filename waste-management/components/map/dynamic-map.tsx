"use client";

import dynamic from "next/dynamic";
import type { SmartBin } from "@/lib/types";
import type { DbBin, DbVehicle, OptimizedRoute } from "@/lib/db-types";

const MapView = dynamic(
  () => import("./map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full rounded-lg border border-border bg-muted/30 flex items-center justify-center" style={{ minHeight: 400 }}>
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    ),
  }
);

interface DynamicMapProps {
  bins?: SmartBin[];
  dbBins?: DbBin[];
  vehicles?: DbVehicle[];
  activeRoute?: OptimizedRoute | null;
  focusedBinId?: string | null;
  height?: number | string;
  isSimulating?: boolean;
  simulatingVehicleId?: string;
}

export function DynamicMap({ bins, dbBins, vehicles, activeRoute, focusedBinId, height = 450, isSimulating, simulatingVehicleId }: DynamicMapProps) {
  return (
    <div style={{ height }} className="w-full">
      <MapView
        bins={bins}
        dbBins={dbBins}
        vehicles={vehicles}
        activeRoute={activeRoute}
        focusedBinId={focusedBinId}
        isSimulating={isSimulating}
        simulatingVehicleId={simulatingVehicleId}
      />
    </div>
  );
}
