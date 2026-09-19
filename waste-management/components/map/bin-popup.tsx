"use client";

import type { SmartBin } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Trash2 } from "lucide-react";

interface BinPopupProps {
  bin: SmartBin;
}

function statusBadge(status: string) {
  switch (status) {
    case "critical":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[11px]">
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[11px]">
          Warning
        </Badge>
      );
    default:
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[11px]">
          Healthy
        </Badge>
      );
  }
}

function fillColor(level: number) {
  if (level >= 80) return "#ef4444";
  if (level >= 50) return "#f59e0b";
  return "#16a34a";
}

export function BinPopup({ bin }: BinPopupProps) {
  return (
    <div className="p-3 min-w-[220px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-xs text-muted-foreground">
          {bin.id}
        </span>
        {statusBadge(bin.status)}
      </div>

      {/* Location */}
      <div className="flex items-center gap-1.5 mb-3">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-medium text-sm">{bin.locationName}</span>
      </div>

      {/* Fill bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-muted-foreground">Fill Level</span>
          <span className="font-bold" style={{ color: fillColor(bin.fillLevel) }}>
            {bin.fillLevel}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${bin.fillLevel}%`,
              backgroundColor: fillColor(bin.fillLevel),
            }}
          />
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">Capacity</span>
          <p className="font-medium">{bin.capacity}L</p>
        </div>
        <div>
          <span className="text-muted-foreground">Waste Type</span>
          <div className="flex items-center gap-1">
            <Trash2 className="h-3 w-3 text-muted-foreground" />
            <p className="font-medium">{bin.wasteType}</p>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Overflow ETA</span>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <p className="font-medium">{bin.predictedFullHours}h</p>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Priority</span>
          <p className="font-medium">{bin.priorityScore}/100</p>
        </div>
      </div>
    </div>
  );
}
