"use client";

import { CheckCircle2, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { WasteClassificationV2Result } from "@/lib/services/ml-api";

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string }> = {
  Plastic:  { emoji: "🧴", color: "text-sky-600",    bg: "bg-sky-50 dark:bg-sky-950/30" },
  Paper:    { emoji: "📦", color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-950/30" },
  Metal:    { emoji: "🥫", color: "text-violet-600",  bg: "bg-violet-50 dark:bg-violet-950/30" },
  Glass:    { emoji: "🍾", color: "text-cyan-600",    bg: "bg-cyan-50 dark:bg-cyan-950/30" },
  Organic:  { emoji: "🍌", color: "text-green-600",   bg: "bg-green-50 dark:bg-green-950/30" },
  Other:    { emoji: "🗑️", color: "text-slate-600",   bg: "bg-slate-50 dark:bg-slate-950/30" },
  Unknown:  { emoji: "❓", color: "text-muted-foreground", bg: "bg-muted/30" },
};

interface ClassificationResultProps {
  result: WasteClassificationV2Result;
}

export function ClassificationResult({ result }: ClassificationResultProps) {
  const cat = result.predicted_class || "Unknown";
  const cfg = CATEGORY_CONFIG[cat] ?? CATEGORY_CONFIG["Unknown"];
  const pct = result.confidence_percentage ?? (result.confidence ?? 0) * 100;
  const isConfident = result.is_confident;

  return (
    <div className="space-y-4">
      {/* Demo mode banner */}
      {result.is_demo_mode && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span>
            <strong>DEMO MODE</strong> — PyTorch not installed. Results are from a colour-heuristic
            fallback. Install torch + torchvision to enable real AI inference.
          </span>
        </div>
      )}

      {/* Low confidence warning */}
      {!isConfident && (
        <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Low Confidence
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 leading-relaxed">
            The AI could not confidently identify the waste type. Try uploading a clearer image with
            better lighting and less background clutter.
          </p>
          <ul className="text-xs text-amber-700/70 dark:text-amber-400/70 space-y-0.5 list-disc list-inside">
            <li>Use a closer shot of the waste item</li>
            <li>Ensure good lighting with no harsh shadows</li>
            <li>Minimise background clutter</li>
          </ul>
        </div>
      )}

      {/* Main result card */}
      <Card className={`shadow-none border-border ${cfg.bg}`}>
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className={`text-5xl leading-none shrink-0 mt-0.5`}>{cfg.emoji}</div>
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Classified as
                  </p>
                  <h3 className={`text-2xl font-bold tracking-tight ${cfg.color}`}>{cat}</h3>
                </div>
                <Badge
                  variant="outline"
                  className={`text-xs px-2.5 py-1 border ${
                    isConfident
                      ? "border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/30 dark:text-green-400"
                      : "border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
                  }`}
                >
                  {isConfident ? (
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                  ) : (
                    <AlertTriangle className="h-3 w-3 mr-1" />
                  )}
                  {isConfident ? "Confident" : "Uncertain"}
                </Badge>
              </div>

              {/* Confidence bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Sparkles className="h-3 w-3" />
                    Confidence
                  </span>
                  <span className={`tabular-nums font-bold ${cfg.color}`}>
                    {pct.toFixed(1)}%
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${Math.min(pct, 100)}%`,
                      background: isConfident
                        ? "linear-gradient(90deg, #16a34a, #22c55e)"
                        : "linear-gradient(90deg, #d97706, #f59e0b)",
                    }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Model: {result.model_name ?? "Waste Classifier"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata grid */}
      {result.recyclability && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Recyclability</p>
            <p className="text-xs font-semibold text-foreground leading-snug">{result.recyclability}</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Smart Bin Target</p>
            <p className="text-xs font-semibold text-primary leading-snug">{result.recommendedBin}</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Carbon Offset</p>
            <p className="text-xs font-semibold text-green-600 leading-snug">{result.carbonOffset}</p>
          </div>
          <div className="p-3 rounded-lg border border-border bg-muted/20 space-y-0.5">
            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Landfill Persistence</p>
            <p className="text-xs font-semibold text-amber-600 leading-snug">{result.decompositionTime}</p>
          </div>
        </div>
      )}

      {/* Tips */}
      {result.tips && (
        <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20">
          <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">Handling Instructions</p>
          <p className="text-xs text-foreground/90 leading-relaxed">{result.tips}</p>
        </div>
      )}
    </div>
  );
}
