"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Leaf,
  BrainCircuit,
  ImagePlus,
  type LucideIcon,
} from "lucide-react";
import { WasteClassifier } from "@/components/waste-classification/WasteClassifier";
import { ClassificationHistory } from "@/components/waste-classification/ClassificationHistory";
import { getClassificationStats } from "@/lib/supabase/queries";
import type { ClassificationStats } from "@/lib/db-types";

// Quick stat card shown in the top banner
function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  iconBg,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`p-2.5 rounded-lg ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          <p className="text-[11px] text-muted-foreground">{sub}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function WasteClassificationPage() {
  const [stats, setStats] = useState<ClassificationStats | null>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  useEffect(() => {
    getClassificationStats().then(setStats);
  }, [historyRefreshKey]);

  const handleClassified = () => {
    // Trigger history refresh after new classification
    setHistoryRefreshKey((k) => k + 1);
  };

  return (
    <>
      <Header
        title="AI Waste Classification"
        subtitle="MobileNetV2 neural inference for real-time waste sorting and recyclability assessment"
      />

      <div className="space-y-6 p-6">
        {/* ── Stats Banner ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={BrainCircuit}
            label="AI Model"
            value="MobileNetV2"
            sub="ImageNet1K pretrained · 6-class mapping"
            iconColor="text-primary"
            iconBg="bg-primary/10"
          />
          <StatCard
            icon={ImagePlus}
            label="Images Classified"
            value={stats?.total != null ? stats.total.toLocaleString() : "—"}
            sub={
              stats?.today_count != null
                ? `${stats.today_count} today · avg ${(stats.avg_confidence * 100).toFixed(0)}% confidence`
                : "Upload an image below to start"
            }
            iconColor="text-blue-600"
            iconBg="bg-blue-500/10"
          />
          <StatCard
            icon={Leaf}
            label="Most Detected"
            value={stats?.most_detected ?? "—"}
            sub={
              stats?.most_detected
                ? `${Math.round(((stats.distribution[stats.most_detected] ?? 0) / (stats.total || 1)) * 100)}% of all classifications`
                : "Classify waste to populate stats"
            }
            iconColor="text-green-600"
            iconBg="bg-green-500/10"
          />
        </div>

        {/* ── Main Classifier ───────────────────────────────────────────────── */}
        <WasteClassifier onClassified={handleClassified} />

        {/* ── Classification History ────────────────────────────────────────── */}
        <ClassificationHistory refreshKey={historyRefreshKey} />
      </div>
    </>
  );
}
