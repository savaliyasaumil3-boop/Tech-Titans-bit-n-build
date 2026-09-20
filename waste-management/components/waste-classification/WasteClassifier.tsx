"use client";

import { useState, useCallback } from "react";
import { Scan, Trash2, Loader2, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImageUploader } from "./ImageUploader";
import { ClassificationResult } from "./ClassificationResult";
import { ConfidenceChart } from "./ConfidenceChart";
import { classifyWasteV2, type WasteClassificationV2Result } from "@/lib/services/ml-api";
import { saveClassification } from "@/lib/supabase/queries";
import type { WasteCategory } from "@/lib/db-types";

type Stage =
  | "idle"
  | "uploading"
  | "preprocessing"
  | "inference"
  | "saving"
  | "done"
  | "error";

const STAGE_LABELS: Record<Stage, string> = {
  idle:         "",
  uploading:    "Uploading image…",
  preprocessing:"Preprocessing image…",
  inference:    "Running AI model…",
  saving:       "Saving result…",
  done:         "Classification complete",
  error:        "Classification failed",
};

const STAGE_ORDER: Stage[] = ["uploading", "preprocessing", "inference", "saving", "done"];

interface WasteClassifierProps {
  onClassified?: () => void;
}

export function WasteClassifier({ onClassified }: WasteClassifierProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<WasteClassificationV2Result | null>(null);
  const [saveWarning, setSaveWarning] = useState(false);

  const handleFileSelected = useCallback((f: File, url: string) => {
    setFile(f);
    setPreviewUrl(url);
    setResult(null);
    setStage("idle");
    setSaveWarning(false);
  }, []);

  const handleClear = useCallback(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setStage("idle");
    setSaveWarning(false);
  }, [previewUrl]);

  const handleAnalyze = useCallback(async () => {
    if (!file || stage === "uploading" || stage === "preprocessing" || stage === "inference") return;

    setSaveWarning(false);
    setResult(null);

    // Staged loading UX
    setStage("uploading");
    await new Promise((r) => setTimeout(r, 400));
    setStage("preprocessing");
    await new Promise((r) => setTimeout(r, 500));
    setStage("inference");

    const res = await classifyWasteV2(file);

    if (!res || res.status === "error") {
      setResult(res ?? {
        success: false,
        status: "error",
        predicted_class: "Unknown",
        confidence: 0,
        confidence_percentage: 0,
        top_predictions: [],
        is_confident: false,
        is_demo_mode: true,
        error_detail: "Could not reach the AI classification service.",
        error: "Service unavailable",
      });
      setStage("error");
      return;
    }

    setStage("saving");

    // Save to Supabase (non-blocking from UX perspective)
    const saved = await saveClassification({
      image_url: null,
      predicted_class: res.predicted_class as WasteCategory,
      confidence: res.confidence,
      top_predictions: res.top_predictions as import("@/lib/db-types").ClassificationPrediction[],
      is_confident: res.is_confident,
      is_demo_mode: res.is_demo_mode,
    });

    if (!saved) setSaveWarning(true);

    setResult(res);
    setStage("done");
    onClassified?.();
  }, [file, stage, onClassified]);

  const isAnalyzing = ["uploading", "preprocessing", "inference", "saving"].includes(stage);
  const stageIndex = STAGE_ORDER.indexOf(stage);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left column — Upload */}
      <div className="lg:col-span-5 space-y-4">
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Scan className="h-4 w-4 text-primary" />
              AI Waste Classification
            </CardTitle>
            <CardDescription className="text-xs">
              Upload a waste image and click &ldquo;Analyze Waste&rdquo; to run real-time AI inference
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploader
              onFileSelected={handleFileSelected}
              onClear={handleClear}
              previewUrl={previewUrl}
              disabled={isAnalyzing}
            />

            {file && (
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2 text-sm"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  id="analyze-waste-btn"
                >
                  {isAnalyzing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Scan className="h-4 w-4" />
                  )}
                  {isAnalyzing ? STAGE_LABELS[stage] : "Analyze Waste"}
                </Button>
                {!isAnalyzing && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleClear}
                    title="Clear image"
                    className="shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Stage progress indicator */}
            {isAnalyzing && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/30 border border-border">
                {STAGE_ORDER.slice(0, 4).map((s, idx) => {
                  const done = idx < stageIndex;
                  const active = idx === stageIndex;
                  return (
                    <div key={s} className={`flex items-center gap-2 text-xs transition-opacity ${
                      active ? "opacity-100" : done ? "opacity-60" : "opacity-30"
                    }`}>
                      {done ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      ) : active ? (
                        <Loader2 className="h-3.5 w-3.5 text-primary animate-spin shrink-0" />
                      ) : (
                        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>
                        {STAGE_LABELS[s]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {saveWarning && (
              <p className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                Classification completed. Result could not be saved to history (Supabase table may not be set up yet).
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right column — Results */}
      <div className="lg:col-span-7 space-y-4">
        {result ? (
          <>
            {/* Error state */}
            {result.status === "error" && (
              <Card className="shadow-none border-destructive/30 bg-destructive/5">
                <CardContent className="p-5">
                  <p className="text-sm font-semibold text-destructive mb-1">Classification Failed</p>
                  <p className="text-xs text-muted-foreground">
                    {result.error_detail || result.error || "An unknown error occurred. Please try again."}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Success state */}
            {result.status === "success" && (
              <>
                <ClassificationResult result={result} />
                {result.top_predictions && result.top_predictions.length > 0 && (
                  <Card className="shadow-none">
                    <CardContent className="pt-5">
                      <ConfidenceChart predictions={result.top_predictions} />
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </>
        ) : (
          /* Empty state */
          <Card className="shadow-none h-full min-h-64">
            <CardContent className="h-full flex items-center justify-center p-8">
              <div className="text-center space-y-3 max-w-xs">
                <div className="text-5xl">🔍</div>
                <p className="text-sm font-medium text-foreground">No image analyzed yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload a waste image on the left and click{" "}
                  <span className="font-semibold text-primary">Analyze Waste</span> to get an AI classification with confidence scores.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
