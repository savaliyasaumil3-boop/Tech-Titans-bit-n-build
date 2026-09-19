"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWasteHistory } from "@/lib/supabase/queries";
import { useAppData } from "@/components/providers/app-data-provider";

const lineColors: Record<string, string> = {
  Plastic: "#0ea5e9",
  Paper: "#f59e0b",
  Metal: "#8b5cf6",
  Glass: "#ec4899",
  Organic: "#16a34a",
  Other: "#6b7280",
};

export function WasteGenerationChart() {
  const { isLive } = useAppData();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const history = await getWasteHistory(undefined, 10);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const daysMap = new Map<string, any>();
      history.forEach((record) => {
        const date = new Date(record.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
        if (!daysMap.has(date)) {
          daysMap.set(date, { date, Plastic: 0, Paper: 0, Metal: 0, Glass: 0, Organic: 0, Other: 0 });
        }
        const dayData = daysMap.get(date)!;
        // Group e-waste into other for cleaner graph
        const cat = record.waste_type === "E-Waste" ? "Other" : record.waste_type;
        dayData[cat] = (dayData[cat] || 0) + record.weight_kg;
      });

      const chartData = Array.from(daysMap.values())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .map(d => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rounded: any = { date: d.date as string };
          Object.keys(lineColors).forEach(type => {
            rounded[type] = Math.round(d[type] || 0);
          });
          return rounded;
        });

      setData(chartData);
    }
    loadData();
  }, [isLive]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Waste Generation Trends
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Daily waste collected by category (kg) — last 10 days
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--hairline)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12, fill: "var(--mute)" }}
                axisLine={{ stroke: "var(--hairline)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "var(--mute)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--hairline)",
                  boxShadow:
                    "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
                  fontSize: 13,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              {Object.entries(lineColors).map(([key, color]) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  name={key}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
