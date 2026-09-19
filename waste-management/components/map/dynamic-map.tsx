"use client";

import dynamic from "next/dynamic";
import type { SmartBin } from "@/lib/types";

const MapView = dynamic(
  () => import("./map-view").then((mod) => mod.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="h-[450px] w-full rounded-lg border border-border bg-muted/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <div className="h-8 w-8 rounded-full border-2 border-current border-t-transparent animate-spin" />
          <span className="text-sm">Loading map…</span>
        </div>
      </div>
    ),
  }
);

interface DynamicMapProps {
  bins: SmartBin[];
}

export function DynamicMap({ bins }: DynamicMapProps) {
  return (
    <div className="h-[450px] w-full">
      <MapView bins={bins} />
    </div>
  );
}
