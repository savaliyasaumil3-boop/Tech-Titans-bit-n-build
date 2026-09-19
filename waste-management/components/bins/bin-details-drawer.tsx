"use client";

import { useState } from "react";
import type { DbBin } from "@/lib/db-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Clock, MapPin, Trash2, Truck, Gauge, BarChart3, TrendingDown } from "lucide-react";
import { getRecommendedAction } from "@/lib/services/priority-engine";
import { useAppData } from "@/components/providers/app-data-provider";

interface BinDetailsDrawerProps {
  bin: DbBin | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function statusBadge(status: string) {
  switch (status) {
    case "critical":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200">
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200">
          Warning
        </Badge>
      );
    default:
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200">
          Healthy
        </Badge>
      );
  }
}

function fillColor(level: number) {
  if (level >= 80) return "bg-red-500";
  if (level >= 50) return "bg-amber-500";
  return "bg-green-500";
}

export function BinDetailsDrawer({
  bin,
  open,
  onOpenChange,
}: BinDetailsDrawerProps) {
  const { refreshData } = useAppData();

  if (!bin) return null;

  const recommendation = getRecommendedAction(
    bin.fill_percentage,
    bin.predicted_full_hours
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between pr-8">
            <SheetTitle>{bin.id}</SheetTitle>
            {statusBadge(bin.status)}
          </div>
          <SheetDescription className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {bin.location_name}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-6 space-y-6">
          {/* Fill level — large display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Fill Level</span>
              <span className="text-2xl font-bold tabular-nums">
                {bin.fill_percentage}%
              </span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${fillColor(bin.fill_percentage)}`}
                style={{ width: `${bin.fill_percentage}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              {bin.capacity_kg}kg capacity · Updated{" "}
              {new Date(bin.last_updated).toLocaleTimeString()}
            </p>
          </div>

          <Separator />

          {/* AI Recommendation */}
          <div className="rounded-lg border border-border p-3 space-y-2 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <TrendingDown className="h-3.5 w-3.5" />
              AI Recommendation
            </div>
            <p className={`text-sm font-medium ${recommendation.color}`}>
              {recommendation.action}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trash2 className="h-3.5 w-3.5" />
                Waste Type
              </div>
              <p className="text-sm font-semibold">{bin.waste_type}</p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Gauge className="h-3.5 w-3.5" />
                Capacity
              </div>
              <p className="text-sm font-semibold">{bin.capacity_kg} kg</p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Overflow ETA
              </div>
              <p className="text-sm font-semibold">
                {bin.predicted_full_hours}h
              </p>
            </div>
            <div className="rounded-lg border border-border p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5" />
                Priority Score
              </div>
              <p className="text-sm font-semibold">{bin.priority_score}/100</p>
            </div>
          </div>

          <Separator />

          {/* Location info */}
          <div>
            <h4 className="text-sm font-medium mb-2">Location</h4>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Coordinates: {bin.latitude.toFixed(4)}, {bin.longitude.toFixed(4)}</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button className="flex-1 gap-2 border-brand text-brand shadow-none" variant="outline">
              <Truck className="h-4 w-4" />
              Optimize Route
            </Button>
            <Button
              className="font-semibold text-white bg-brand hover:bg-brand/90 hover:text-white px-8"
              onClick={async () => {
                try {
                  const res = await fetch("http://127.0.0.1:8000/api/collections/pickup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      bin_id: bin.id,
                      vehicle_id: "VEH-001",
                      driver_id: "DRIVER-01",
                      collected_weight_kg: bin.current_fill_kg || 40.0,
                      residual_fill_percentage: 0.0
                    })
                  });
                  if (res.ok) {
                    alert(`Bin ${bin.id} collection pickup completed successfully!`);
                    onOpenChange(false);
                    refreshData();
                  } else {
                    const err = await res.json();
                    alert(`Pickup Failed: ${err.detail || 'Server error'}`);
                  }
                } catch (e) {
                  alert(`Pickup Request Failed: ${e}`);
                }
              }}
            >
              Confirm Collect
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

