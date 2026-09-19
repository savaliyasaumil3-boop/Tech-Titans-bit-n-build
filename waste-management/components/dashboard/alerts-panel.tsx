"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { alerts } from "@/lib/mock-data";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Info,
  Truck,
  Wrench,
  Route,
} from "lucide-react";

const severityDot: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-amber-500",
  medium: "bg-yellow-500",
  low: "bg-blue-400",
};

const typeIcon: Record<string, React.ReactNode> = {
  overflow: <AlertTriangle className="h-4 w-4 text-red-500" />,
  maintenance: <Wrench className="h-4 w-4 text-yellow-500" />,
  collection: <Truck className="h-4 w-4 text-green-500" />,
  system: <Info className="h-4 w-4 text-blue-400" />,
  route: <Route className="h-4 w-4 text-amber-500" />,
};

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsPanel() {
  const recent = alerts
    .filter((a) => !a.resolved)
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 6);

  const resolvedCount = alerts.filter((a) => a.resolved).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Recent Alerts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {recent.length} active · {resolvedCount} resolved
            </p>
          </div>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-0 divide-y divide-border">
            {recent.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 px-6 py-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="mt-0.5 shrink-0">
                  {typeIcon[alert.type] || (
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div
                      className={`h-1.5 w-1.5 rounded-full ${severityDot[alert.severity]}`}
                    />
                    <span className="text-xs capitalize text-muted-foreground">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(alert.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
