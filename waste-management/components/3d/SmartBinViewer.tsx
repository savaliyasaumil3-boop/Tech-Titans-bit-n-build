"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { useBin3DStore, type InspectionAngle } from "@/lib/store/use-bin-3d-store";
import { SmartBinScene } from "./SmartBinScene";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  X,
  Eye,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Truck,
  Battery,
  Thermometer,
  Wifi,
  Clock,
  Flame,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Unlock,
} from "lucide-react";

export function SmartBinViewer() {
  const { bins, vehicles, resolveAlert } = useAppData();
  const {
    isOpen,
    selectedBinId,
    activeAngle,
    isLidOpen,
    simulatedFill,
    close3DViewer,
    selectBin,
    setActiveAngle,
    toggleLid,
    setSimulatedFill,
  } = useBin3DStore();

  if (!isOpen || !selectedBinId) return null;

  const currentBinIndex = bins.findIndex((b) => b.id === selectedBinId);
  const bin = bins[currentBinIndex] || bins[0];

  if (!bin) return null;

  // Derive fill level (simulated override or live data)
  const displayFill = simulatedFill !== null ? simulatedFill : bin.fill_percentage;
  const computedStatus =
    displayFill >= 80 ? "critical" : displayFill >= 50 ? "warning" : "healthy";
  const displayKg = Math.round((displayFill / 100) * bin.capacity_kg);

  // Cycle to previous / next bin
  const handlePrevBin = () => {
    const prevIdx = (currentBinIndex - 1 + bins.length) % bins.length;
    selectBin(bins[prevIdx].id);
  };

  const handleNextBin = () => {
    const nextIdx = (currentBinIndex + 1) % bins.length;
    selectBin(bins[nextIdx].id);
  };

  const angles: Array<{ id: InspectionAngle; label: string; icon: React.ReactNode }> = [
    { id: "front", label: "Front View", icon: <Eye className="h-3.5 w-3.5" /> },
    { id: "top", label: "Top Lid", icon: <Unlock className="h-3.5 w-3.5" /> },
    { id: "side", label: "Side View", icon: <Layers className="h-3.5 w-3.5" /> },
    { id: "inside", label: "Internal Fill", icon: <Sparkles className="h-3.5 w-3.5" /> },
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="relative w-full max-w-6xl h-[90vh] max-h-[850px] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col text-card-foreground"
        >
          {/* Header Bar */}
          <div className="h-16 px-6 border-b border-border bg-muted/40 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-foreground">{bin.id} — 3D Digital Twin Inspection</h2>
                  <Badge
                    variant={
                      computedStatus === "critical"
                        ? "destructive"
                        : computedStatus === "warning"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-xs px-2 py-0.5 font-bold"
                  >
                    {computedStatus.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{bin.location_name} • Ahmedabad Municipal Corporation</p>
              </div>
            </div>

            {/* Quick Navigation & Close */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted rounded-lg p-1 border border-border">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-background"
                  onClick={handlePrevBin}
                  title="Previous Bin"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs font-mono font-medium px-2 text-muted-foreground">
                  {currentBinIndex + 1} / {bins.length}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-foreground hover:bg-background"
                  onClick={handleNextBin}
                  title="Next Bin"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-muted hover:bg-muted/80 text-foreground"
                onClick={close3DViewer}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Main Inspection Viewport Area */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
            {/* Left/Center: Interactive R3F 3D Canvas + Viewport Overlay Controls */}
            <div className="lg:col-span-8 relative flex flex-col p-4 bg-slate-950 border-r border-border">
              {/* R3F 3D Canvas */}
              <div className="flex-1 relative w-full h-full min-h-[400px]">
                <SmartBinScene
                  fillLevel={displayFill}
                  status={computedStatus}
                  wasteType={bin.waste_type}
                  binId={bin.id}
                  isLidOpen={isLidOpen}
                />
              </div>

              {/* Viewport Control Bar */}
              <div className="mt-4 p-3 rounded-xl bg-card/95 border border-border backdrop-blur-md flex flex-wrap items-center justify-between gap-3 text-card-foreground">
                {/* View Angle Selector Buttons */}
                <div className="flex items-center gap-1.5 bg-muted p-1 rounded-lg border border-border">
                  {angles.map((ang) => (
                    <button
                      key={ang.id}
                      onClick={() => setActiveAngle(ang.id)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        activeAngle === ang.id
                          ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-background"
                      }`}
                    >
                      {ang.icon}
                      <span>{ang.label}</span>
                    </button>
                  ))}
                </div>

                {/* Lid Toggle Action */}
                <Button
                  size="sm"
                  variant={isLidOpen ? "default" : "outline"}
                  onClick={toggleLid}
                  className="text-xs gap-1.5 font-semibold"
                >
                  {isLidOpen ? <Unlock className="h-3.5 w-3.5 text-yellow-500" /> : <Lock className="h-3.5 w-3.5" />}
                  {isLidOpen ? "Close Lid" : "Open Solar Lid"}
                </Button>

                {/* Interactive Live Fill Level Simulator Slider */}
                <div className="flex items-center gap-3 min-w-[200px] flex-1 max-w-[280px]">
                  <span className="text-xs text-muted-foreground font-medium shrink-0">Simulate Fill:</span>
                  <Slider
                    value={[displayFill]}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(val: number[]) => setSimulatedFill(val[0])}
                    className="flex-1"
                  />
                  <span className="text-xs font-mono font-bold text-primary w-9 text-right">
                    {displayFill}%
                  </span>
                </div>
              </div>
            </div>

            {/* Right Panel: Bin Telemetry, Sensors, AI Predictions & Dispatch */}
            <div className="lg:col-span-4 p-5 space-y-5 overflow-y-auto bg-muted/20">
              {/* Telemetry Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Fill Level</span>
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{displayFill}%</p>
                  <p className="text-[11px] text-muted-foreground">{displayKg} / {bin.capacity_kg} kg payload</p>
                </div>

                <div className="p-3.5 rounded-xl bg-card border border-border">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>Priority Score</span>
                    {computedStatus === "critical" ? (
                      <Flame className="h-3.5 w-3.5 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{bin.priority_score}</p>
                  <p className="text-[11px] text-muted-foreground">Dispatch Priority Index</p>
                </div>
              </div>

              {/* Sensor Telemetry List */}
              <div className="p-4 rounded-xl bg-card border border-border space-y-3">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                  Live Sensor Telemetry
                </h3>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Ultrasonic Clearance</span>
                    <span className="font-mono font-semibold text-foreground">
                      {Math.round((1 - displayFill / 100) * 110)} cm
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Battery className="h-3 w-3 text-green-500" /> Battery Charge
                    </span>
                    <span className="font-mono font-semibold text-foreground">94% (Solar Charged)</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Thermometer className="h-3 w-3 text-amber-500" /> Internal Temperature
                    </span>
                    <span className="font-mono font-semibold text-foreground">31.4 °C</span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/60">
                    <span className="text-muted-foreground">Waste Material Stream</span>
                    <span className="font-medium text-primary">{bin.waste_type}</span>
                  </div>

                  <div className="flex justify-between py-1">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3 text-blue-500" /> Predicted Overflow
                    </span>
                    <span className="font-mono font-bold text-amber-600">
                      In ~{bin.predicted_full_hours} Hours
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-2"
                  onClick={() => {
                    alert(`Dispatched collection vehicle to ${bin.id} (${bin.location_name})!`);
                    close3DViewer();
                  }}
                >
                  <Truck className="h-4 w-4" />
                  Dispatch Collection Truck
                </Button>

                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={close3DViewer}
                >
                  Return to City Map
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
