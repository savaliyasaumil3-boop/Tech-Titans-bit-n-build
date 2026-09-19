"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Route,
  Navigation,
  Fuel,
  Leaf,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
  MapPin,
  Truck,
} from "lucide-react";

interface RouteItem {
  id: string;
  name: string;
  zone: string;
  assignedVehicle: string;
  driver: string;
  stopsCount: number;
  totalDistanceKm: number;
  estTimeMins: number;
  co2SavedKg: number;
  fuelEfficiency: string;
  urgencyLevel: "Critical" | "High" | "Normal";
  status: "In Progress" | "Pending" | "Completed";
  stops: { name: string; fillLevel: number; wasteType: string }[];
}

const initialRoutes: RouteItem[] = [
  {
    id: "RT-AHM-01",
    name: "Route A — Western Highway Corridor",
    zone: "SG Highway / Vastrapur",
    assignedVehicle: "SwachhVahan-01",
    driver: "Rajesh Patel",
    stopsCount: 6,
    totalDistanceKm: 14.2,
    estTimeMins: 45,
    co2SavedKg: 18.4,
    fuelEfficiency: "32% vs unoptimized",
    urgencyLevel: "Critical",
    status: "In Progress",
    stops: [
      { name: "SG Highway Junction", fillLevel: 92, wasteType: "Plastic" },
      { name: "Prahlad Nagar Garden", fillLevel: 91, wasteType: "E-Waste" },
      { name: "Vastrapur Lake Garden", fillLevel: 88, wasteType: "Plastic" },
      { name: "Satellite Road", fillLevel: 55, wasteType: "Paper" },
      { name: "Bodakdev Circle", fillLevel: 58, wasteType: "Organic" },
      { name: "Judges Bunglow Rd", fillLevel: 81, wasteType: "E-Waste" },
    ],
  },
  {
    id: "RT-AHM-02",
    name: "Route B — Central Commercial Loop",
    zone: "CG Road / Navrangpura",
    assignedVehicle: "SwachhVahan-02",
    driver: "Amit Shah",
    stopsCount: 5,
    totalDistanceKm: 11.5,
    estTimeMins: 35,
    co2SavedKg: 14.1,
    fuelEfficiency: "28% vs unoptimized",
    urgencyLevel: "High",
    status: "In Progress",
    stops: [
      { name: "CG Road Market", fillLevel: 78, wasteType: "Paper" },
      { name: "Law Garden", fillLevel: 85, wasteType: "Organic" },
      { name: "IIM Ahmedabad Gate", fillLevel: 72, wasteType: "Paper" },
      { name: "Gujarat University", fillLevel: 50, wasteType: "Organic" },
      { name: "Ambawadi Circle", fillLevel: 95, wasteType: "Metal" },
    ],
  },
  {
    id: "RT-AHM-03",
    name: "Route C — Heritage & Riverfront Circuit",
    zone: "Shahibaug / Sabarmati",
    assignedVehicle: "SwachhVahan-04",
    driver: "Vikram Mehta",
    stopsCount: 4,
    totalDistanceKm: 16.8,
    estTimeMins: 50,
    co2SavedKg: 22.0,
    fuelEfficiency: "35% vs unoptimized",
    urgencyLevel: "Critical",
    status: "In Progress",
    stops: [
      { name: "Shahibaug Palace", fillLevel: 89, wasteType: "Plastic" },
      { name: "Gandhinagar Highway", fillLevel: 83, wasteType: "Metal" },
      { name: "Sabarmati Ashram", fillLevel: 48, wasteType: "Paper" },
      { name: "Ashram Road Riverfront", fillLevel: 42, wasteType: "Plastic" },
    ],
  },
  {
    id: "RT-AHM-04",
    name: "Route D — South East Transit Path",
    zone: "Paldi / Maninagar",
    assignedVehicle: "SwachhVahan-03",
    driver: "Priya Desai",
    stopsCount: 4,
    totalDistanceKm: 9.6,
    estTimeMins: 30,
    co2SavedKg: 12.3,
    fuelEfficiency: "24% vs unoptimized",
    urgencyLevel: "Normal",
    status: "Pending",
    stops: [
      { name: "Paldi Cross Road", fillLevel: 62, wasteType: "Glass" },
      { name: "Maninagar Station", fillLevel: 35, wasteType: "Metal" },
      { name: "Nehru Bridge", fillLevel: 15, wasteType: "Metal" },
      { name: "Memnagar Bus Stop", fillLevel: 68, wasteType: "Plastic" },
    ],
  },
];

export default function RoutesPage() {
  const [routes, setRoutes] = useState<RouteItem[]>(initialRoutes);
  const [selectedRoute, setSelectedRoute] = useState<RouteItem>(initialRoutes[0]);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleReoptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      setIsOptimizing(false);
    }, 1200);
  };

  return (
    <>
      <Header
        title="AI Dynamic Route Optimization"
        subtitle="Graph neural network pathfinding, traffic-aware dispatch, and carbon reduction metrics"
      />

      <div className="space-y-6 p-6">
        {/* Top Metric Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Route className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active Dispatch Routes</p>
                <p className="text-xl font-bold tracking-tight">4 Routes</p>
                <p className="text-[11px] text-muted-foreground">19 Smart Bins covered</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <Leaf className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total CO₂ Offset Today</p>
                <p className="text-xl font-bold tracking-tight text-green-600">66.8 kg</p>
                <p className="text-[11px] text-muted-foreground">+31% vs traditional routing</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Fuel className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Fuel Reduction</p>
                <p className="text-xl font-bold tracking-tight text-amber-600">29.7%</p>
                <p className="text-[11px] text-muted-foreground">Optimized waypoint clustering</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Collection Time</p>
                <p className="text-xl font-bold tracking-tight text-blue-600">40 Mins</p>
                <p className="text-[11px] text-muted-foreground">-18 mins faster per vehicle</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              AI Engine continuously recalculates paths based on live sensor fill rates and traffic data.
            </span>
          </div>
          <Button
            onClick={handleReoptimize}
            disabled={isOptimizing}
            size="sm"
            className="gap-2 shrink-0"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isOptimizing ? "animate-spin" : ""}`} />
            {isOptimizing ? "Recalculating Graphs…" : "Run Route AI Optimizer"}
          </Button>
        </div>

        {/* Main 2-Column Section: Routes List & Waypoint Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Route Cards List */}
          <div className="lg:col-span-6 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground tracking-wide uppercase">
              Generated AI Routes
            </h3>
            {routes.map((r) => {
              const isSelected = selectedRoute.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-muted">
                          {r.id}
                        </span>
                        <h4 className="font-semibold text-sm">{r.name}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Zone: {r.zone}</p>
                    </div>
                    <Badge
                      className={
                        r.urgencyLevel === "Critical"
                          ? "bg-red-500/10 text-red-600 border-red-200 text-[11px]"
                          : r.urgencyLevel === "High"
                          ? "bg-amber-500/10 text-amber-600 border-amber-200 text-[11px]"
                          : "bg-green-500/10 text-green-600 border-green-200 text-[11px]"
                      }
                    >
                      {r.urgencyLevel}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/60 text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Vehicle / Driver</span>
                      <span className="font-medium truncate block">{r.assignedVehicle}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Stops & Dist</span>
                      <span className="font-medium">{r.stopsCount} stops ({r.totalDistanceKm} km)</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[11px]">CO₂ Savings</span>
                      <span className="font-medium text-green-600">{r.co2SavedKg} kg</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected Route Waypoints & Detailed Step-by-Step */}
          <div className="lg:col-span-6">
            <Card className="h-full shadow-none">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-primary" />
                      {selectedRoute.name}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Assigned to {selectedRoute.assignedVehicle} ({selectedRoute.driver}) · Estimated duration: {selectedRoute.estTimeMins} mins
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal">
                    {selectedRoute.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs flex justify-between items-center">
                  <div>
                    <span className="text-muted-foreground">Efficiency Optimization:</span>{" "}
                    <span className="font-semibold text-primary">{selectedRoute.fuelEfficiency}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="h-7 text-xs gap-1.5">
                      <Play className="h-3 w-3" />
                      Dispatch Turn-by-Turn
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase">
                    Ordered Waypoints (Priority-Weighted)
                  </h4>
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                    {selectedRoute.stops.map((stop, idx) => (
                      <div key={idx} className="relative flex items-center justify-between text-xs">
                        <div
                          className={`absolute -left-6 h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                            stop.fillLevel >= 80
                              ? "bg-red-500 text-white border-red-600"
                              : stop.fillLevel >= 50
                              ? "bg-amber-500 text-white border-amber-600"
                              : "bg-primary text-white border-primary"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground">{stop.name}</p>
                          <p className="text-muted-foreground text-[11px]">Type: {stop.wasteType}</p>
                        </div>
                        <div className="text-right">
                          <span
                            className={`font-semibold tabular-nums text-xs ${
                              stop.fillLevel >= 80
                                ? "text-red-600"
                                : stop.fillLevel >= 50
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}
                          >
                            {stop.fillLevel}% Fill
                          </span>
                          <span className="block text-[10px] text-muted-foreground">
                            {stop.fillLevel >= 80 ? "Immediate" : "Scheduled"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
