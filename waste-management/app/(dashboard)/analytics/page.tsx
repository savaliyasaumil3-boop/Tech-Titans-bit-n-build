"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Leaf,
  Recycle,
  Scale,
  Award,
  ArrowUpRight,
} from "lucide-react";
import { useAppData } from "@/components/providers/app-data-provider";
import { getWasteHistory } from "@/lib/supabase/queries";
import type { DbWasteRecord } from "@/lib/db-types";

// Colors for waste types
const WASTE_COLORS: Record<string, string> = {
  Plastic: "#0ea5e9", // blue
  Paper: "#f59e0b",   // amber
  Metal: "#8b5cf6",   // purple
  Glass: "#ec4899",   // pink
  Organic: "#16a34a", // green
  "E-Waste": "#ef4444", // red
  Other: "#6b7280",   // gray
};

export default function AnalyticsPage() {
  const { isLive } = useAppData();
  const [history, setHistory] = useState<DbWasteRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const data = await getWasteHistory(undefined, 10);
      setHistory(data);
      setLoading(false);
    }
    loadHistory();
  }, [isLive]);

  // Process data for Generation Trend (by day & type)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const daysMap = new Map<string, any>();
  history.forEach((record) => {
    const date = new Date(record.recorded_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (!daysMap.has(date)) {
      daysMap.set(date, { date, Plastic: 0, Paper: 0, Metal: 0, Glass: 0, Organic: 0, "E-Waste": 0, Other: 0, total: 0 });
    }
    const dayData = daysMap.get(date)!;
    dayData[record.waste_type] = (dayData[record.waste_type] || 0) + record.weight_kg;
    dayData.total += record.weight_kg;
  });

  const generationData = Array.from(daysMap.values())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(d => {
      // Round all numbers for clean tooltip
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rounded: any = { date: d.date, total: Math.round((d.total as number)) };
      Object.keys(WASTE_COLORS).forEach(type => {
        rounded[type] = Math.round(d[type] || 0);
      });
      return rounded;
    });

  // Process data for Composition Donut
  const compMap = new Map<string, number>();
  history.forEach((record) => {
    compMap.set(record.waste_type, (compMap.get(record.waste_type) || 0) + record.weight_kg);
  });
  const totalWeight = Array.from(compMap.values()).reduce((a, b) => a + b, 0);
  const compositionData = Array.from(compMap.entries())
    .map(([name, value]) => ({
      name,
      value: Math.round(value),
      percentage: totalWeight > 0 ? (value / totalWeight) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  // Process data for High-Generation Areas (simulated by bin prefix/area)
  // Our IDs usually have BIN-001, but they are mapped to locations
  // We'll mock the zone performance based on the history generated
  const zonePerformanceData = [
    { zone: "SG Highway", collected: 420, recycled: 360, efficiency: 85.7 },
    { zone: "Vastrapur", collected: 380, recycled: 330, efficiency: 86.8 },
    { zone: "Navrangpura", collected: 340, recycled: 305, efficiency: 89.7 },
    { zone: "CG Road", collected: 290, recycled: 265, efficiency: 91.3 },
    { zone: "Bodakdev", collected: 310, recycled: 275, efficiency: 88.7 },
    { zone: "Shahibaug", collected: 520, recycled: 300, efficiency: 57.6, alert: true }, // High generation area
    { zone: "Paldi", collected: 250, recycled: 220, efficiency: 88.0 },
  ];

  return (
    <>
      <Header
        title="Predictive Waste Analytics"
        subtitle="Long-term city trend forecasting, zonal segregation metrics, and ESG compliance"
      />

      <div className="space-y-6 p-6">
        {/* KPI Top Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <Recycle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Diversion & Recycling Rate</p>
                <p className="text-xl font-bold tracking-tight text-green-600">87.4%</p>
                <div className="flex items-center gap-1 text-[11px] text-green-600 mt-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                  <span>+4.2% from last month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Scale className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Monthly Volume</p>
                <p className="text-xl font-bold tracking-tight">{(totalWeight / 1000).toFixed(1)} Tons</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Based on {history.length} records</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Net CO₂ Reduction</p>
                <p className="text-xl font-bold tracking-tight text-amber-600">18.6 MT</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Equivalent to 840 trees planted</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Swachh Ranking Score</p>
                <p className="text-xl font-bold tracking-tight text-blue-600">94 / 100</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Top Tier Smart City Status</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1: Generation Trends + Composition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">10-Day Waste Generation (kg)</CardTitle>
              <CardDescription className="text-xs">Dynamic generation tracked from DB records</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Loading data...
                </div>
              ) : (
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={generationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                      <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#888888" tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} stroke="#888888" tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: "var(--background)",
                          borderColor: "var(--border)",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      {Object.keys(WASTE_COLORS).map((type) => (
                        <Line
                          key={type}
                          type="monotone"
                          dataKey={type}
                          stroke={WASTE_COLORS[type]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold">Overall Composition</CardTitle>
              <CardDescription className="text-xs">Historical breakdown across all zones</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground text-sm">
                  Loading data...
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="h-[220px] w-[220px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compositionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={95}
                          stroke="none"
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {compositionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={WASTE_COLORS[entry.name]} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          formatter={(value: any) => [`${value} kg`, "Amount"]}
                          contentStyle={{
                            backgroundColor: "var(--background)",
                            borderColor: "var(--border)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 grid grid-cols-2 gap-x-2 gap-y-3">
                    {compositionData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-sm"
                          style={{ backgroundColor: WASTE_COLORS[item.name] }}
                        />
                        <div>
                          <p className="text-xs font-semibold">{item.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.percentage.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Zonal Collection (incorporating high-generation alert) */}
        <Card className="shadow-none border-amber-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  High Generation Areas — Zonal Waste Generation vs Recycled Volume
                </CardTitle>
                <CardDescription className="text-xs">
                  Efficiency breakdown across key Ahmedabad residential & commercial sectors
                </CardDescription>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-muted-foreground/40" />
                  <span className="text-muted-foreground">Collected</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-primary" />
                  <span className="text-foreground font-medium">Recycled</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-red-500" />
                  <span className="text-foreground font-medium">High Gen Alert</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={zonePerformanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="zone" tick={{ fontSize: 12 }} stroke="#888888" tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#888888" tickLine={false} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderColor: "var(--border)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="collected" radius={[4, 4, 0, 0]} name="Collected (kg)">
                    {zonePerformanceData.map((entry, index) => (
                      <Cell key={`cell-coll-${index}`} fill={entry.alert ? "#ef4444" : "#94a3b8"} />
                    ))}
                  </Bar>
                  <Bar dataKey="recycled" fill="#16a34a" radius={[4, 4, 0, 0]} name="Recycled (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-100 dark:border-red-900/50 flex items-start gap-3">
              <TrendingUp className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">High Waste Generation Detected</p>
                <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">
                  Shahibaug area generated 520kg today, which is 28% above its historical average. Review collection frequency.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
