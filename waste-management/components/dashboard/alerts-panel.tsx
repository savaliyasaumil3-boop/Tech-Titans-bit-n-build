"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useAppData } from "@/components/providers/app-data-provider";
import {
  AlertTriangle,
  Bell,
  Info,
  Truck,
  TrendingUp,
  Settings,
} from "lucide-react";

const severityDot: Record<string, string> = {
  critical: "bg-red-500",
  warning: "bg-amber-500",
  info: "bg-blue-400",
};

function typeIcon(type: string) {
  switch (type) {
    case "overflow": return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case "high_generation": return <TrendingUp className="h-4 w-4 text-amber-500" />;
    case "vehicle": return <Truck className="h-4 w-4 text-blue-500" />;
    case "system": return <Settings className="h-4 w-4 text-blue-400" />;
    default: return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function timeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function AlertsPanel() {
  const { alerts, resolveAlert } = useAppData();

  const recent = [...alerts]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  const unreadCount = alerts.filter((a) => !a.is_read).length;
  const readCount = alerts.filter((a) => a.is_read).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold tracking-tight">
              Recent Alerts
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {unreadCount} unread · {readCount} dismissed
            </p>
          </div>
          <div className="relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                {Math.min(unreadCount, 9)}
              </span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[320px]">
          <div className="space-y-0 divide-y divide-border">
            {recent.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 px-6 py-3.5 transition-colors ${
                  alert.is_read ? "opacity-50" : "hover:bg-muted/40"
                }`}
              >
                <div className="mt-0.5 shrink-0">{typeIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{alert.message}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className={`h-1.5 w-1.5 rounded-full ${severityDot[alert.severity] ?? "bg-gray-400"}`} />
                    <span className="text-xs capitalize text-muted-foreground">
                      {alert.severity}
                    </span>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(alert.created_at)}
                    </span>
                  </div>
                </div>
                {!alert.is_read && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 shrink-0 text-muted-foreground"
                    onClick={() => resolveAlert(alert.id)}
                    title="Dismiss"
                  >
                    ×
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
