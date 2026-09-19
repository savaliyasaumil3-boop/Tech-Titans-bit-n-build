"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { BinFilters } from "@/components/bins/bin-filters";
import { BinsTable } from "@/components/bins/bins-table";
import { useAppData } from "@/components/providers/app-data-provider";
import type { BinStatus, WasteType } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, AlertTriangle, CheckCircle2, Flame } from "lucide-react";

export default function BinsPage() {
  const { bins } = useAppData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BinStatus | "all">("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | "all">("all");

  const totalCount = bins.length;
  const criticalCount = bins.filter((b) => b.status === "critical").length;
  const warningCount = bins.filter((b) => b.status === "warning").length;
  const healthyCount = bins.filter((b) => b.status === "healthy").length;

  return (
    <>
      <Header
        title="Smart Bin Network"
        subtitle="Real-time fill levels, telemetry, and automated collection triggers"
      />

      <div className="space-y-6 p-6">
        {/* Quick summary stat row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-muted text-foreground">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Bins</p>
                <p className="text-xl font-bold tracking-tight">{totalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Critical (&gt;80%)</p>
                <p className="text-xl font-bold tracking-tight text-red-600">{criticalCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Warning (50-80%)</p>
                <p className="text-xl font-bold tracking-tight text-amber-600">{warningCount}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Healthy (&lt;50%)</p>
                <p className="text-xl font-bold tracking-tight text-green-600">{healthyCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 shadow-none">
          <BinFilters
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            wasteTypeFilter={wasteTypeFilter}
            onWasteTypeChange={setWasteTypeFilter}
          />
        </Card>

        {/* Table & Drawer */}
        <BinsTable
          bins={bins}
          search={search}
          statusFilter={statusFilter}
          wasteTypeFilter={wasteTypeFilter}
        />
      </div>
    </>
  );
}
