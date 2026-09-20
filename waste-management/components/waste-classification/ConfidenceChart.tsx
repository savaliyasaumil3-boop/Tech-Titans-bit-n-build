"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import type { ClassificationPredictionItem } from "@/lib/services/ml-api";

const CATEGORY_COLORS: Record<string, string> = {
  Plastic:  "#0ea5e9",
  Paper:    "#f59e0b",
  Metal:    "#8b5cf6",
  Glass:    "#06b6d4",
  Organic:  "#16a34a",
  Other:    "#6b7280",
  Unknown:  "#9ca3af",
};

interface ConfidenceChartProps {
  predictions: ClassificationPredictionItem[];
}

export function ConfidenceChart({ predictions }: ConfidenceChartProps) {
  if (!predictions || predictions.length === 0) return null;

  const data = predictions.map((p) => ({
    name: p.class,
    value: p.confidence_percentage ?? (p.confidence ?? 0) * 100,
    fill: CATEGORY_COLORS[p.class] ?? "#6b7280",
  }));

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Top Predictions
      </p>

      {/* Visual bars */}
      <div className="space-y-2">
        {data.map((item) => (
          <div key={item.name} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-foreground">{item.name}</span>
              <span className="tabular-nums text-muted-foreground">{item.value.toFixed(1)}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(item.value, 100)}%`,
                  backgroundColor: item.fill,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Recharts bar chart for extra visual weight */}
      <div className="h-28 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
            <XAxis type="number" domain={[0, 100]} hide />
            <YAxis
              type="category"
              dataKey="name"
              width={56}
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              formatter={(value) => [`${Number(value).toFixed(1)}%`, "Confidence"]}
              contentStyle={{
                fontSize: 11,
                borderRadius: "8px",
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--background))",
              }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={16}>
              {data.map((entry, idx) => (
                <Cell key={idx} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
