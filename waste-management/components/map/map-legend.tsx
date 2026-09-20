"use client";

import type { SmartBin } from "@/lib/types";

interface MapLegendProps {
  bins: SmartBin[];
}

export function MapLegend({ bins }: MapLegendProps) {
  const healthy = bins.filter((b) => b.status === "healthy").length;
  const warning = bins.filter((b) => b.status === "warning").length;
  const critical = bins.filter((b) => b.status === "critical").length;
  const pickedUp = bins.filter((b) => b.status === "picked_up").length;

  return (
    <div className="absolute bottom-4 left-4 z-[1000] rounded-lg border border-border bg-background/95 backdrop-blur-sm p-3 shadow-sm">
      <p className="text-xs font-medium mb-2 text-foreground">
        {bins.length} Bins
      </p>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            Healthy ({healthy})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span className="text-muted-foreground">
            Warning ({warning})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
          <span className="text-muted-foreground">
            Critical ({critical})
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span className="text-muted-foreground">
            Picked Up ({pickedUp})
          </span>
        </div>
      </div>
    </div>
  );
}
