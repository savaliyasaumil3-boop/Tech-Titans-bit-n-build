"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { alerts as initialAlerts } from "@/lib/mock-data";
import type { Alert, AlertSeverity, AlertType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Bell,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Info,
  Clock,
  Search,
  Check,
  RotateCcw,
  Trash2,
} from "lucide-react";

function severityBadge(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[11px] font-semibold">
          Critical
        </Badge>
      );
    case "high":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[11px] font-semibold">
          High
        </Badge>
      );
    case "medium":
      return (
        <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200 text-[11px] font-medium">
          Medium
        </Badge>
      );
    case "low":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-200 text-[11px] font-medium">
          Low
        </Badge>
      );
  }
}

export default function AlertsPage() {
  const [alertsList, setAlertsList] = useState<Alert[]>(initialAlerts);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "resolved">("all");

  const totalAlerts = alertsList.length;
  const activeAlerts = alertsList.filter((a) => !a.resolved);
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;

  const toggleResolve = (id: string) => {
    setAlertsList((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: !a.resolved } : a))
    );
  };

  const markAllResolved = () => {
    setAlertsList((prev) => prev.map((a) => ({ ...a, resolved: true })));
  };

  const filtered = alertsList.filter((a) => {
    const matchesSearch =
      search === "" ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase()) ||
      (a.binId && a.binId.toLowerCase().includes(search.toLowerCase()));

    const matchesSeverity = severityFilter === "all" || a.severity === severityFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !a.resolved) ||
      (statusFilter === "resolved" && a.resolved);

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  return (
    <>
      <Header
        title="Alerts & System Incidents"
        subtitle="Real-time threshold triggers, hardware malfunctions, and emergency collection requests"
      />

      <div className="space-y-6 p-6">
        {/* Top Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Incidents</p>
                <p className="text-xl font-bold tracking-tight">{activeAlerts.length}</p>
                <p className="text-[11px] text-muted-foreground">Across smart network</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-red-500/10 text-red-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Critical Overflow Alerts</p>
                <p className="text-xl font-bold tracking-tight text-red-600">{criticalCount}</p>
                <p className="text-[11px] text-muted-foreground">Immediate dispatch recommended</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Resolved Today</p>
                <p className="text-xl font-bold tracking-tight text-green-600">
                  {alertsList.filter((a) => a.resolved).length}
                </p>
                <p className="text-[11px] text-muted-foreground">Avg response time: 14 mins</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card className="p-4 shadow-none">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-1 flex-col sm:flex-row gap-3 w-full">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search alert by ID, message, or bin ID…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>

              <Select
                value={severityFilter}
                onValueChange={(v) => setSeverityFilter(v as AlertSeverity | "all")}
              >
                <SelectTrigger className="w-[150px] h-9 text-sm">
                  <SelectValue placeholder="All Severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as "all" | "active" | "resolved")}
              >
                <SelectTrigger className="w-[140px] h-9 text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="resolved">Resolved Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={markAllResolved}
              className="text-xs shrink-0 gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              Resolve All Active
            </Button>
          </div>
        </Card>

        {/* Alerts List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground shadow-none">
              No incidents or alerts match your active filter.
            </Card>
          ) : (
            filtered.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  alert.resolved
                    ? "bg-muted/20 border-border opacity-70"
                    : alert.severity === "critical"
                    ? "bg-red-500/5 border-red-200 ring-1 ring-red-500/10"
                    : alert.severity === "high"
                    ? "bg-amber-500/5 border-amber-200 ring-1 ring-amber-500/10"
                    : "bg-card border-border"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {alert.resolved ? (
                      <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                    ) : alert.severity === "critical" ? (
                      <Flame className="h-5 w-5 text-red-600" />
                    ) : alert.severity === "high" ? (
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                    ) : (
                      <Info className="h-5 w-5 text-blue-600" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                        {alert.id}
                      </span>
                      {alert.binId && (
                        <span className="font-mono text-xs text-primary font-medium">
                          {alert.binId}
                        </span>
                      )}
                      {severityBadge(alert.severity)}
                      <span className="text-xs text-muted-foreground uppercase font-semibold">
                        Type: {alert.type}
                      </span>
                    </div>
                    <p
                      className={`text-sm mt-1.5 font-medium ${
                        alert.resolved ? "line-through text-muted-foreground" : "text-foreground"
                      }`}
                    >
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1" suppressHydrationWarning>
                      <Clock className="h-3 w-3" />
                      <span suppressHydrationWarning>{new Date(alert.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}</span>
                      <span>·</span>
                      <span suppressHydrationWarning>{new Date(alert.timestamp).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <Button
                    size="sm"
                    variant={alert.resolved ? "ghost" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => toggleResolve(alert.id)}
                  >
                    {alert.resolved ? (
                      <>
                        <RotateCcw className="h-3 w-3" /> Re-open
                      </>
                    ) : (
                      <>
                        <Check className="h-3 w-3" /> Mark Resolved
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
