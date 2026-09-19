"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { WasteGenerationChart } from "@/components/dashboard/waste-generation-chart";
import { WasteCompositionChart } from "@/components/dashboard/waste-composition-chart";
import {
  BarChart,
  Bar,
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
  Sparkles,
} from "lucide-react";

const zonePerformanceData = [
  { zone: "SG Highway", collected: 420, recycled: 360, efficiency: 85.7 },
  { zone: "Vastrapur", collected: 380, recycled: 330, efficiency: 86.8 },
  { zone: "Navrangpura", collected: 340, recycled: 305, efficiency: 89.7 },
  { zone: "CG Road", collected: 290, recycled: 265, efficiency: 91.3 },
  { zone: "Bodakdev", collected: 310, recycled: 275, efficiency: 88.7 },
  { zone: "Shahibaug", collected: 360, recycled: 300, efficiency: 83.3 },
  { zone: "Paldi", collected: 250, recycled: 220, efficiency: 88.0 },
];

export default function AnalyticsPage() {
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
                <p className="text-xl font-bold tracking-tight">54.2 Tons</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Ahmedabad Municipal Corp.</p>
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
          <WasteGenerationChart />
          <WasteCompositionChart />
        </div>

        {/* Charts Row 2: Zonal Collection vs Recycled Efficiency */}
        <Card className="shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">
                  Zonal Waste Generation vs Recycled Volume (kg/day)
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
                  <span className="text-foreground font-medium">Recycled / Composted</span>
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
                  <Bar dataKey="collected" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Collected (kg)" />
                  <Bar dataKey="recycled" fill="#16a34a" radius={[4, 4, 0, 0]} name="Recycled (kg)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
