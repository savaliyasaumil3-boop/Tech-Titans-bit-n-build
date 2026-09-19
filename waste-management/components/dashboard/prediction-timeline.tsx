"use client";

import { useEffect, useState } from "react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Clock, AlertTriangle, Flame, ChevronRight } from "lucide-react";
import Link from "next/link";

function urgencyColor(hours: number): string {
  if (hours <= 2) return "bg-red-500";
  if (hours <= 6) return "bg-amber-500";
  if (hours <= 12) return "bg-yellow-400";
  return "bg-green-500";
}

function urgencyBadge(hours: number) {
  if (hours <= 2)
    return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[10px] animate-pulse">🔴 Critical — {hours}h</Badge>;
  if (hours <= 6)
    return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[10px]">🟡 High — {hours}h</Badge>;
  if (hours <= 12)
    return <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200 text-[10px]">🟠 Medium — {hours}h</Badge>;
  return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[10px]">🟢 Low — {hours}h</Badge>;
}

// Countdown timer hook — ticks every 30 seconds
function useCountdown(hoursRemaining: number) {
  const [seconds, setSeconds] = useState(hoursRemaining * 3600);
  useEffect(() => {
    setSeconds(hoursRemaining * 3600);
  }, [hoursRemaining]);
  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => Math.max(0, s - 30)), 30000);
    return () => clearInterval(t);
  }, []);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function BinRow({ bin }: { bin: { id: string; location_name: string; fill_percentage: number; predicted_full_hours: number; waste_type: string } }) {
  const countdown = useCountdown(bin.predicted_full_hours);
  // Fill bar width: invert — more urgent = more filled bar
  const urgencyPct = Math.min(100, Math.max(5, 100 - (bin.predicted_full_hours / 48) * 100));

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
      {/* Urgency indicator */}
      <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${urgencyColor(bin.predicted_full_hours)} ${bin.predicted_full_hours <= 2 ? "animate-pulse" : ""}`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">{bin.location_name}</p>
            <p className="text-[11px] text-muted-foreground">{bin.id} · {bin.waste_type}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-xs font-medium">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <span className={bin.predicted_full_hours <= 2 ? "text-red-600 font-bold" : ""}>{countdown}</span>
            </div>
          </div>
        </div>
        {/* Urgency progress bar */}
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${urgencyColor(bin.predicted_full_hours)}`}
              style={{ width: `${bin.fill_percentage}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground w-8 text-right">{bin.fill_percentage}%</span>
        </div>
      </div>

      {urgencyBadge(bin.predicted_full_hours)}
    </div>
  );
}

export function PredictionTimeline() {
  const { bins } = useAppData();

  // Sort by predicted overflow time ascending (most urgent first), take top 7
  const sortedBins = [...bins]
    .filter((b) => b.fill_percentage >= 40) // only bins worth monitoring
    .sort((a, b) => a.predicted_full_hours - b.predicted_full_hours)
    .slice(0, 7);

  const criticalCount = sortedBins.filter((b) => b.predicted_full_hours <= 2).length;
  const highCount = sortedBins.filter((b) => b.predicted_full_hours > 2 && b.predicted_full_hours <= 6).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-semibold tracking-tight">
              AI Overflow Prediction
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-600 font-semibold animate-pulse">
                <Flame className="h-3.5 w-3.5" />
                {criticalCount} imminent
              </span>
            )}
            {highCount > 0 && (
              <span className="text-xs text-amber-600 font-medium">
                <AlertTriangle className="h-3 w-3 inline mr-0.5" />
                {highCount} high
              </span>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Live fill-level forecast — bins ranked by overflow urgency. Model accuracy: 94.1%
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-0">
          {sortedBins.map((bin) => (
            <BinRow key={bin.id} bin={bin} />
          ))}
          {sortedBins.length === 0 && (
            <div className="py-8 text-center text-muted-foreground text-sm">
              All bins are healthy — no overflow risk detected
            </div>
          )}
        </div>

        <Link href="/bins">
          <Button variant="ghost" size="sm" className="w-full mt-2 text-xs text-muted-foreground hover:text-foreground gap-1">
            View all {bins.length} bins
            <ChevronRight className="h-3 w-3" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
