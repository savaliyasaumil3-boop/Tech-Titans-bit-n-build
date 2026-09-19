"use client";

import { useState, type FormEvent } from "react";
import { Header } from "@/components/layout/header";
import { BinFilters } from "@/components/bins/bin-filters";
import { BinsTable } from "@/components/bins/bins-table";
import { useAppData } from "@/components/providers/app-data-provider";
import type { BinStatus, WasteType } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, AlertTriangle, CheckCircle2, Flame } from "lucide-react";

export default function BinsPage() {
  const { bins } = useAppData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BinStatus | "all">("all");
  const [wasteTypeFilter, setWasteTypeFilter] = useState<WasteType | "all">("all");
  const [readingBinId, setReadingBinId] = useState("");
  const [readingFill, setReadingFill] = useState("");
  const [readingWeight, setReadingWeight] = useState("");
  const [readingSource, setReadingSource] = useState<"sensor" | "manual" | "verified_complaint">("manual");
  const [readingMessage, setReadingMessage] = useState("");

  const totalCount = bins.length;
  const criticalCount = bins.filter((b) => b.status === "critical").length;
  const warningCount = bins.filter((b) => b.status === "warning").length;
  const healthyCount = bins.filter((b) => b.status === "healthy").length;

  const submitReading = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !readingBinId || readingFill === "") return;
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) { setReadingMessage("Supervisor session expired."); return; }
    const response = await fetch("/api/supervisor/bin-reading", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` }, body: JSON.stringify({ bin_id: readingBinId, fill_percentage: Number(readingFill), measured_weight_kg: readingWeight ? Number(readingWeight) : undefined, reading_source: readingSource, idempotency_key: `${readingBinId}-${readingFill}-${readingWeight}-${Date.now()}` }) });
    const result = await response.json();
    setReadingMessage(response.ok ? (result.assigned ? "Reading saved and vehicle assignment dispatched." : result.request?.unassigned_reason ?? "Reading saved; request remains visible for dispatch.") : result.error ?? "Reading failed.");
    if (response.ok) { setReadingFill(""); setReadingWeight(""); }
  };

  return (
    <>
      <Header
        title="Smart Bin Network"
        subtitle="Real-time fill levels, telemetry, and automated collection triggers"
      />

      <div className="space-y-6 p-6">
        <Card>
          <CardContent className="p-4"><form onSubmit={submitReading} className="grid grid-cols-1 gap-3 md:grid-cols-5"><Select value={readingBinId} onValueChange={(value) => value && setReadingBinId(value)}><SelectTrigger><SelectValue placeholder="Select bin" /></SelectTrigger><SelectContent>{bins.map((bin) => <SelectItem key={bin.id} value={bin.id}>{bin.id} · {bin.location_name}</SelectItem>)}</SelectContent></Select><Input required type="number" min="0" max="100" placeholder="Fill %" value={readingFill} onChange={(e) => setReadingFill(e.target.value)} /><Input type="number" min="0" placeholder="Measured kg (optional)" value={readingWeight} onChange={(e) => setReadingWeight(e.target.value)} /><Select value={readingSource} onValueChange={(value) => value && setReadingSource(value as typeof readingSource)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="manual">Verified manual</SelectItem><SelectItem value="sensor">Sensor</SelectItem><SelectItem value="verified_complaint">Verified complaint</SelectItem></SelectContent></Select><Button type="submit">Record reading</Button></form>{readingMessage && <p role="status" className="mt-3 text-sm text-muted-foreground">{readingMessage}</p>}</CardContent>
        </Card>
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
