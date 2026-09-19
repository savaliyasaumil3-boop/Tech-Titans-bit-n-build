"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useAppData } from "@/components/providers/app-data-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Bell,
  Info,
  Search,
  Settings,
  TrendingUp,
  Truck,
  CheckCircle2,
  Filter,
} from "lucide-react";
import type { DbAlert } from "@/lib/db-types";

function typeIcon(type: string) {
  switch (type) {
    case "overflow":
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "high_generation":
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    case "vehicle":
      return <Truck className="h-4 w-4 text-blue-500" />;
    case "system":
      return <Settings className="h-4 w-4 text-blue-400" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function severityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[11px]">🔴 Critical</Badge>;
    case "warning":
      return <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[11px]">🟡 Warning</Badge>;
    default:
      return <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[11px]">🔵 Info</Badge>;
  }
}

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  return `${Math.floor(hours / 24)} days ago`;
}

export default function AlertsPage() {
  const { alerts, resolveAlert } = useAppData();
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("unread");

  const filtered = alerts.filter((a) => {
    if (search && !a.message.toLowerCase().includes(search.toLowerCase())) return false;
    if (severityFilter !== "all" && a.severity !== severityFilter) return false;
    if (typeFilter !== "all" && a.type !== typeFilter) return false;
    if (statusFilter === "unread" && a.is_read) return false;
    if (statusFilter === "read" && !a.is_read) return false;
    return true;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.is_read).length;
  const warningCount = alerts.filter((a) => a.severity === "warning" && !a.is_read).length;
  const infoCount = alerts.filter((a) => a.severity === "info" && !a.is_read).length;

  function resolveAll() {
    alerts.filter((a) => !a.is_read).forEach((a) => resolveAlert(a.id));
  }

  return (
    <>
      <Header
        title="Alert Center"
        subtitle="Real-time system alerts and notifications"
      />

      <div className="space-y-6 p-6">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
                <p className="text-xs text-red-500 font-medium">Critical</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Bell className="h-8 w-8 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{warningCount}</p>
                <p className="text-xs text-amber-500 font-medium">Warning</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Info className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{infoCount}</p>
                <p className="text-xs text-blue-500 font-medium">Info</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base font-semibold">All Alerts</CardTitle>
              <Button size="sm" variant="outline" onClick={resolveAll} className="text-xs">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Resolve All
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search alerts…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <Select value={severityFilter} onValueChange={(val) => val && setSeverityFilter(val)}>
                <SelectTrigger className="w-[120px] h-8 text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(val) => val && setTypeFilter(val)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="overflow">Overflow</SelectItem>
                  <SelectItem value="high_generation">High Generation</SelectItem>
                  <SelectItem value="vehicle">Vehicle</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {sorted.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No alerts match your filters</p>
                </div>
              ) : (
                sorted.map((alert) => (
                  <div
                    key={alert.id}
                    className={`flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors ${
                      alert.is_read ? "opacity-50" : ""
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">{typeIcon(alert.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {severityBadge(alert.severity)}
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {alert.type.replace("_", " ")}
                        </Badge>
                        {alert.bin_id && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {alert.bin_id}
                          </span>
                        )}
                        {alert.vehicle_id && (
                          <span className="text-xs font-mono text-muted-foreground">
                            {alert.vehicle_id}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {timeAgo(alert.created_at)}
                        </span>
                      </div>
                    </div>
                    {!alert.is_read ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs shrink-0"
                        onClick={() => resolveAlert(alert.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Resolve
                      </Button>
                    ) : (
                      <Badge variant="outline" className="text-[11px] text-green-600 border-green-200 bg-green-50 shrink-0">
                        Resolved
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
