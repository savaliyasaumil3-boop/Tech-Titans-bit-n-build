"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { DynamicMap } from "@/components/map/dynamic-map";
import { useAppData } from "@/components/providers/app-data-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Route, Compass, Play, Square } from "lucide-react";
import { fallbackOptimizeRoute } from "@/lib/services/ml-api";
import type { OptimizedRoute } from "@/lib/db-types";

function timeFormat(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function RoutesPage() {
  const { bins, vehicles, priorityBins } = useAppData();
  const [selectedVehicle, setSelectedVehicle] = useState<string>("");
  const [activeRoute, setActiveRoute] = useState<OptimizedRoute | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  const availableVehicles = vehicles.filter(v => v.status === "available" || v.status === "collecting");

  const handleOptimize = async () => {
    if (!selectedVehicle) return;

    setIsOptimizing(true);
    // Artificial delay to simulate ML processing
    await new Promise(r => setTimeout(r, 1200));

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) {
      setIsOptimizing(false);
      return;
    }

    // Use ML service fallback for hackathon demonstration
    // We need capacity_kg, so map from priorityBins using the full bins array
    const mappedBins = priorityBins.map(pb => {
      const dbBin = bins.find(b => b.id === pb.bin_id);
      return {
        ...pb,
        id: pb.bin_id,
        capacity_kg: dbBin?.capacity_kg ?? 200
      };
    });

    const route = fallbackOptimizeRoute(
      vehicle.id,
      vehicle.vehicle_number,
      vehicle.capacity_kg - vehicle.current_load_kg, // Use remaining capacity
      mappedBins
    );

    setActiveRoute(route);
    setIsOptimizing(false);
  };

  const clearRoute = () => {
    setActiveRoute(null);
    setIsSimulating(false);
  };

  return (
    <>
      <Header
        title="Route Optimization (OR-Tools)"
        subtitle="AI-driven dynamic routing based on collection priority and vehicle capacity"
      />

      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Compass className="h-4 w-4 text-brand" />
                  Route Generator
                </CardTitle>
                <CardDescription className="text-xs">
                  Generate optimized TSP routes using Google OR-Tools
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium">Select Vehicle</label>
                  <Select value={selectedVehicle} onValueChange={(val) => val && setSelectedVehicle(val)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select available vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableVehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>
                          <div className="flex justify-between w-full">
                            <span>{v.id}</span>
                            <span className="text-muted-foreground ml-2">
                              ({v.capacity_kg - v.current_load_kg}kg avail)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  className="w-full"
                  disabled={!selectedVehicle || isOptimizing}
                  onClick={handleOptimize}
                >
                  {isOptimizing ? "Optimizing..." : "Generate Optimal Route"}
                </Button>
              </CardContent>
            </Card>

            {activeRoute && (
              <Card className="border-blue-200">
                <CardHeader className="pb-3 bg-blue-50/50 dark:bg-blue-950/20">
                  <CardTitle className="text-sm font-semibold flex items-center justify-between">
                    <span>Route Summary</span>
                    <Badge variant="outline" className="bg-white dark:bg-black">
                      {activeRoute.vehicle_id}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Distance</span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Route className="h-3.5 w-3.5 text-blue-500" />
                        {activeRoute.total_distance_km} km
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Est. Time</span>
                      <span className="font-semibold flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                        {timeFormat(activeRoute.estimated_time_minutes)}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Collection</span>
                      <span className="font-semibold">{activeRoute.total_collection_kg} kg</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-muted-foreground block">Stops</span>
                      <span className="font-semibold">{activeRoute.stops.length} bins</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="text-xs font-medium mb-3">Planned Waypoints</div>
                    <div className="space-y-0 text-sm pl-2">
                      <div className="flex gap-3 pb-3 relative">
                        <div className="w-px h-full bg-border absolute left-1.5 top-2" />
                        <div className="h-3 w-3 rounded-full bg-gray-300 shrink-0 mt-1 relative z-10" />
                        <span className="text-muted-foreground">DEPOT</span>
                      </div>

                      {activeRoute.stops.map((stop) => (
                        <div key={stop.id} className="flex gap-3 pb-3 relative">
                          <div className="w-px h-full bg-border absolute left-1.5 top-2" />
                          <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0 mt-1 relative z-10" />
                          <div className="flex-1">
                            <span className="font-medium mr-2">{stop.id}</span>
                            <span className="text-muted-foreground text-xs">{stop.required_collection_kg}kg</span>
                          </div>
                        </div>
                      ))}

                      <div className="flex gap-3 relative">
                        <div className="h-3 w-3 rounded-full bg-gray-300 shrink-0 mt-1 relative z-10" />
                        <span className="text-muted-foreground">DEPOT Return</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className={`flex-1 ${isSimulating ? "bg-red-500 hover:bg-red-600 outline-none" : "bg-green-600 hover:bg-green-700"}`}
                      onClick={() => setIsSimulating(!isSimulating)}
                    >
                      {isSimulating ? <><Square className="h-4 w-4 mr-1.5" /> Stop Sim</> : <><Play className="h-4 w-4 mr-1.5" /> Start Sim</>}
                    </Button>
                    <Button size="sm" variant="outline" onClick={clearRoute}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right panel - Map */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardContent className="p-0 h-[calc(100vh-140px)] min-h-[500px]">
                <DynamicMap
                  dbBins={bins}
                  vehicles={vehicles}
                  activeRoute={activeRoute}
                  height="100%"
                />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
