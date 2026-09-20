"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Filter, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClassificationHistory } from "@/lib/supabase/queries";
import type { DbWasteClassification, WasteCategory } from "@/lib/db-types";

const CATEGORY_EMOJIS: Record<string, string> = {
  Plastic:  "🧴",
  Paper:    "📦",
  Metal:    "🥫",
  Glass:    "🍾",
  Organic:  "🍌",
  Other:    "🗑️",
  Unknown:  "❓",
};

const FILTER_OPTIONS: Array<WasteCategory | "All"> = [
  "All", "Plastic", "Paper", "Metal", "Glass", "Organic", "Other",
];

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

interface ClassificationHistoryProps {
  refreshKey?: number;
}

export function ClassificationHistory({ refreshKey }: ClassificationHistoryProps) {
  const [records, setRecords] = useState<DbWasteClassification[]>([]);
  const [filter, setFilter] = useState<WasteCategory | "All">("All");
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const load = useCallback(async (f: WasteCategory | "All") => {
    setLoading(true);
    const data = await getClassificationHistory(f === "All" ? undefined : f, 100);
    setRecords(data);
    setPage(0);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async data fetch pattern, setState is in callback not synchronous
    void load(filter);
  }, [load, filter, refreshKey]);

  const paginated = records.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const totalPages = Math.ceil(records.length / PAGE_SIZE);

  if (records.length === 0 && !loading) return null;

  return (
    <Card className="shadow-none">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Classification History</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1.5 text-muted-foreground"
            onClick={() => load(filter)}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
        <CardDescription className="text-xs">
          {records.length} classification{records.length !== 1 ? "s" : ""} from database
        </CardDescription>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setFilter(opt)}
              className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                filter === opt
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="py-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history…
          </div>
        ) : paginated.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            No {filter !== "All" ? filter : ""} classifications found.
          </div>
        ) : (
          <>
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Confidence</th>
                    <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginated.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">
                            {CATEGORY_EMOJIS[item.predicted_class] ?? "🗑️"}
                          </span>
                          <span className="font-medium text-foreground">
                            {item.predicted_class}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${Math.min(item.confidence * 100, 100)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-muted-foreground">
                            {(item.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 ${
                              item.is_confident
                                ? "border-green-300 text-green-600"
                                : "border-amber-300 text-amber-600"
                            }`}
                          >
                            {item.is_confident ? "AI" : "Standard"}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {formatDate(item.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                <span className="text-xs text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2.5"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
