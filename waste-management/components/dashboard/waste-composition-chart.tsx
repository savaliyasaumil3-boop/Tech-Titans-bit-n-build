"use client";

import { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getWasteHistory } from "@/lib/supabase/queries";
import { useAppData } from "@/components/providers/app-data-provider";

const WASTE_COLORS: Record<string, string> = {
  Plastic: "#0ea5e9",
  Paper: "#f59e0b",
  Metal: "#8b5cf6",
  Glass: "#ec4899",
  Organic: "#16a34a",
  Other: "#6b7280",
};

export function WasteCompositionChart() {
  const { isLive } = useAppData();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      const history = await getWasteHistory(undefined, 30); // use longer period for composition stability

      const compMap = new Map<string, number>();
      history.forEach((record) => {
        const cat = record.waste_type === "E-Waste" ? "Other" : record.waste_type;
        compMap.set(cat, (compMap.get(cat) || 0) + record.weight_kg);
      });

      const totalWeight = Array.from(compMap.values()).reduce((a, b) => a + b, 0);

      const chartData = Array.from(compMap.entries())
        .map(([name, value]) => ({
          name,
          value: totalWeight > 0 ? Number(((value / totalWeight) * 100).toFixed(1)) : 0,
          color: WASTE_COLORS[name] || "#6b7280"
        }))
        .sort((a, b) => b.value - a.value);

      setData(chartData);
    }
    loadData();
  }, [isLive]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Waste Composition
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Breakdown by waste category
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Chart */}
          <div className="h-[220px] w-[220px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--hairline)",
                    boxShadow:
                      "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
                    fontSize: 13,
                  }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={(value: any) => [`${value}%`, ""]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm w-full">
            {data.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-muted-foreground whitespace-nowrap">{entry.name}</span>
                <span className="ml-auto font-medium tabular-nums pl-2">
                  {entry.value}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
