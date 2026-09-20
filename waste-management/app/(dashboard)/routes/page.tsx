"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { DynamicMap } from "@/components/map/dynamic-map";
import { useAppData } from "@/components/providers/app-data-provider";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Route, Compass, Play, Square } from "lucide-react";
import { optimizeRoute, fallbackOptimizeRoute } from "@/lib/services/ml-api";
import { buildVehicleRoutePlan } from "@/lib/services/route-optimizer";
import type { OptimizedRoute } from "@/lib/db-types";
import { supabase } from "@/lib/supabase/client";

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
  const [selectedDriver, setSelectedDriver] = useState("");
  const [drivers, setDrivers] = useState<{ id: string; full_name: string | null; driver_id: string | null; vehicle_id: string | null }[]>([]);
  const [dispatchMessage, setDispatchMessage] = useState<string | null>(null);
  const [requests, setRequests] = useState<{ id: string; bin_id: string; status: string; assigned_vehicle_id: string | null; required_quantity_kg: number }[]>([]);

  const availableVehicles = vehicles.filter(v => v.status === "available" || v.status === "collecting");
  const refreshRequests = async () => {
    const client = supabase;
    if (!client) return;
    const { data } = await client.from("collection_requests").select("id, bin_id, status, assigned_vehicle_id, required_quantity_kg").in("status", ["unassigned", "assigned", "accepted", "in_progress", "partially_completed"]).order("updated_at", { ascending: false });
    setRequests(data ?? []);
  };

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    void client.from("profiles").select("id, full_name, driver_id, vehicle_id").eq("role", "driver").then(({ data }) => setDrivers(data ?? []));
    void refreshRequests();

    const channel = client
      .channel("route-request-assignment-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "collection_requests" }, () => void refreshRequests())
      .on("postgres_changes", { event: "*", schema: "public", table: "route_plans" }, () => void refreshRequests())
      .subscribe();

    return () => { void client.removeChannel(channel); };
  }, []);

  const handleOptimize = async () => {
    if (!selectedVehicle) return;

    setIsOptimizing(true);
    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) {
      setIsOptimizing(false);
      return;
    }

    const assignedBinIds = new Set(
      requests
        .filter((request) => request.assigned_vehicle_id)
        .map((request) => request.bin_id)
    );

    const requestBins = priorityBins.filter((bin) => {
      const alreadyAssignedElsewhere = assignedBinIds.has(bin.bin_id);
      const isPickedUp = bins.some((dbBin) => dbBin.id === bin.bin_id && dbBin.status === "picked_up");
      return !alreadyAssignedElsewhere && !isPickedUp;
    });

    const mappedBins = requestBins.map(pb => {
      const dbBin = bins.find(b => b.id === pb.bin_id);
      const fillPercent = Math.min(Math.max(pb.fill_percentage, 0), 100);
      const capacity = dbBin?.capacity_kg ?? 200;
      const remainingCapacityKg = Math.max(0, vehicle.capacity_kg - vehicle.current_load_kg);
      const requiredCollectionKg = Math.min(Math.round((fillPercent / 100) * capacity), remainingCapacityKg);
      return {
        ...pb,
        id: pb.bin_id,
        fill_percentage: fillPercent,
        capacity_kg: capacity,
        required_collection_kg: requiredCollectionKg,
      };
    }).filter((bin) => bin.fill_percentage >= 50 && bin.required_collection_kg > 0);

    const payload = {
      vehicle_id: vehicle.id,
      vehicle_capacity_kg: vehicle.capacity_kg - vehicle.current_load_kg,
      bins: mappedBins.map(b => ({
        id: b.id,
        location_name: b.location_name,
        latitude: b.latitude,
        longitude: b.longitude,
        required_collection_kg: b.required_collection_kg,
        priority: b.priority_score
      }))
    };

    const typedRequests: Array<{ bin_id: string; assigned_vehicle_id: string | null }> = requests;

    let route = await optimizeRoute(payload);
    if (!route || route.stops.length === 0) {
      route = fallbackOptimizeRoute(
        vehicle.id,
        vehicle.vehicle_number,
        vehicle.capacity_kg - vehicle.current_load_kg,
        mappedBins,
        { latitude: vehicle.latitude, longitude: vehicle.longitude },
        typedRequests
      );
      setDispatchMessage("Local route planner used from live bin records; review before dispatch.");
    }

    route.stops = route.stops.filter((stop) => !typedRequests.some((request) => request.bin_id === stop.id && request.assigned_vehicle_id));
    if (!route.stops.length) {
      route = buildVehicleRoutePlan({
        vehicle: {
          id: vehicle.id,
          vehicle_number: vehicle.vehicle_number,
          capacity_kg: vehicle.capacity_kg,
          current_load_kg: vehicle.current_load_kg,
          latitude: vehicle.latitude,
          longitude: vehicle.longitude,
          status: vehicle.status,
        },
        bins: mappedBins,
        requests: typedRequests,
      });
      setDispatchMessage("No eligible bins remain for this vehicle after capacity and assignment checks.");
    }

    setActiveRoute(route);
    if (supabase && selectedDriver && route) {
      const routeId = `ROUTE-${vehicle.id}-${Date.now()}`;
      const { error } = await supabase.from("route_plans").insert({
        id: routeId,
        vehicle_id: vehicle.id,
        driver_id: selectedDriver,
        status: "dispatched",
        total_distance_km: route.total_distance_km,
        estimated_time_minutes: route.estimated_time_minutes,
        stops_json: route.stops,
        dispatched_at: new Date().toISOString(),
      });
      if (!error) {
        const { error: stopsError } = await supabase.from("route_stops").insert(route.stops.map((stop) => ({
          id: `${routeId}-${stop.id}`,
          route_plan_id: routeId,
          bin_id: stop.id,
          sequence_order: stop.order,
          planned_load_kg: stop.required_collection_kg,
          status: "pending",
        })));
        if (!stopsError) {
          await supabase.from("collection_requests").update({ assigned_vehicle_id: vehicle.id, assigned_route_id: routeId, status: "assigned", reservation_kg: route.stops.reduce((total, stop) => total + stop.required_collection_kg, 0), updated_at: new Date().toISOString() }).in("bin_id", route.stops.map((stop) => stop.id)).in("status", ["unassigned", "partially_completed"]);
          const checklistRows = route.stops.flatMap((stop) => [
            ["verify_bin", "Verify the bin ID and location"],
            ["inspect_waste", "Inspect waste type and access safety"],
            ["record_reading", "Record weight and residual fill"],
            ["secure_area", "Secure the area before leaving"],
          ].map(([checklist_key, label]) => ({ id: `${routeId}-${stop.id}-${checklist_key}`, route_plan_id: routeId, route_stop_id: `${routeId}-${stop.id}`, driver_id: selectedDriver, checklist_key, label, is_required: true })));
          await supabase.from("stop_checklist_items").upsert(checklistRows, { onConflict: "route_stop_id,checklist_key" });
        }
        setDispatchMessage(stopsError ? stopsError.message : "Assignment dispatched to the selected driver.");
      } else setDispatchMessage(error.message);
    } else if (!selectedDriver) {
      setDispatchMessage("Select an assigned driver before dispatching this route.");
    }
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

                  <div className="space-y-2">
                    <label className="text-xs font-medium">Assign Driver</label>
                    <Select value={selectedDriver} onValueChange={(val) => val && setSelectedDriver(val)}>
                      <SelectTrigger className="w-full"><SelectValue placeholder="Select driver..." /></SelectTrigger>
                      <SelectContent>{drivers.filter((d) => !selectedVehicle || !d.vehicle_id || d.vehicle_id === selectedVehicle).map((driver) => <SelectItem key={driver.id} value={driver.driver_id ?? driver.id}>{driver.full_name ?? driver.driver_id ?? driver.id}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <Button
                  className="w-full"
                  disabled={!selectedVehicle || isOptimizing}
                  onClick={handleOptimize}
                >
                  {isOptimizing ? "Optimizing..." : "Generate Optimal Route"}
                </Button>
                {dispatchMessage && <p role="status" className="text-xs text-muted-foreground">{dispatchMessage}</p>}
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
                            <span className="font-medium mr-2">{stop.name}</span>
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
                  isSimulating={isSimulating}
                  simulatingVehicleId={activeRoute?.vehicle_id}
                />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </>
  );
}
