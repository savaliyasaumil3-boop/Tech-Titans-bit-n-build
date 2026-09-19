"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sliders,
  BellRing,
  Cpu,
  Shield,
  Save,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";

export default function SettingsPage() {
  const [criticalThreshold, setCriticalThreshold] = useState("80");
  const [warningThreshold, setWarningThreshold] = useState("50");
  const [simulationInterval, setSimulationInterval] = useState("20");
  const [enableVoiceAlerts, setEnableVoiceAlerts] = useState(true);
  const [enableAutoDispatch, setEnableAutoDispatch] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <Header
        title="Settings & System Configuration"
        subtitle="Telemetry thresholds, AI engine parameters, IoT refresh intervals, and role-based permissions"
      />

      <div className="space-y-6 p-6 max-w-4xl">
        {/* Threshold Configuration */}
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sliders className="h-4 w-4 text-primary" />
              Smart Bin Thresholds & Automated Triggers
            </CardTitle>
            <CardDescription className="text-xs">
              Configure fill percentage boundaries that trigger warnings and emergency dispatches
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Critical Fill Trigger (%)
                </label>
                <Input
                  type="number"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bins exceeding this generate urgent alerts & route prioritization
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Warning Level Trigger (%)
                </label>
                <Input
                  type="number"
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(e.target.value)}
                  className="h-9 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Bins in this range are flagged for next routine cycle
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI & Telemetry Simulation Settings */}
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Cpu className="h-4 w-4 text-primary" />
              IoT Simulation & AI Engine Parameters
            </CardTitle>
            <CardDescription className="text-xs">
              Live simulation cadence and automated route dispatching heuristics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Live Telemetry Simulation Heartbeat (Seconds)
              </label>
              <Input
                type="number"
                value={simulationInterval}
                onChange={(e) => setSimulationInterval(e.target.value)}
                className="h-9 text-sm max-w-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Frequency at which simulated ultrasonic sensor readings jitter and refresh
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">Automatic Route Re-optimization</p>
                  <p className="text-xs text-muted-foreground">
                    Dynamically modify driver routes when new critical alerts fire
                  </p>
                </div>
                <Button
                  variant={enableAutoDispatch ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnableAutoDispatch(!enableAutoDispatch)}
                  className="text-xs h-7"
                >
                  {enableAutoDispatch ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
                <div>
                  <p className="text-sm font-medium">Sound & Emergency Voice Broadcasts</p>
                  <p className="text-xs text-muted-foreground">
                    Audible chime when a bin reaches &gt;90% overflow state
                  </p>
                </div>
                <Button
                  variant={enableVoiceAlerts ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEnableVoiceAlerts(!enableVoiceAlerts)}
                  className="text-xs h-7"
                >
                  {enableVoiceAlerts ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System & Hardware Identity */}
        <Card className="shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Deployment Context & City Node
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-2 text-xs">
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Municipal Zone</span>
              <span className="font-semibold">Ahmedabad Smart City (AMC West & Central)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border/60">
              <span className="text-muted-foreground">Active Hub Gateway</span>
              <span className="font-mono font-medium">AHM-GW-SWACHH-09</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">AI Edge Inference Model</span>
              <span className="font-medium text-primary flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> MobileNetV4 WasteSeg v2.4 (Quantized INT8)
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button onClick={handleSave} className="gap-2">
            {saved ? (
              <>
                <Check className="h-4 w-4 text-white" />
                Changes Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save System Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
}
