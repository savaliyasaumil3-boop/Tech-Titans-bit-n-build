"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Header } from "@/components/layout/header";
import { useAppData } from "@/components/providers/app-data-provider";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  MapPin,
  Clock,
  Search,
  User,
  Package,
} from "lucide-react";
import type { DbVehicle } from "@/lib/db-types";
import { supabase } from "@/lib/supabase/client";

function vehicleStatusBadge(status: DbVehicle["status"]) {
  const styles: Record<DbVehicle["status"], string> = {
    available: "bg-green-500/10 text-green-600 border-green-200",
    collecting: "bg-blue-500/10 text-blue-600 border-blue-200",
    returning: "bg-purple-500/10 text-purple-600 border-purple-200",
    maintenance: "bg-red-500/10 text-red-600 border-red-200",
    offline: "bg-gray-500/10 text-gray-500 border-gray-200",
  };
  const labels: Record<DbVehicle["status"], string> = {
    available: "Available",
    collecting: "Collecting",
    returning: "Returning",
    maintenance: "Maintenance",
    offline: "Offline",
  };
  return <Badge className={`text-[11px] font-medium ${styles[status]}`}>{labels[status]}</Badge>;
}

function loadColor(pct: number) {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-blue-500";
}

function timeAgo(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  return `${h}h ago`;
}

export default function VehiclesPage() {
  const { vehicles, refreshData } = useAppData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<DbVehicle | null>(null);
  const [isUnloading, setIsUnloading] = useState(false);
  const [fleetActionMessage, setFleetActionMessage] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; full_name: string | null; driver_id: string | null }[]>([]);
  const [registration, setRegistration] = useState({ vehicle_number: "", vehicle_type: "Compactor Truck", capacity_kg: "1000", supported_waste_streams: "Mixed Recyclable", service_area: "", depot: "", latitude: "23.0225", longitude: "72.5714", existing_driver_id: "", driver_name: "", driver_email: "", driver_phone: "", temporary_password: "" });
  const [registrationState, setRegistrationState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [registrationMessage, setRegistrationMessage] = useState("");

  useEffect(() => {
    if (!supabase) return;
    void supabase.from("profiles").select("id, full_name, driver_id").eq("role", "driver").order("full_name").then(({ data }) => setDrivers(data ?? []));
  }, []);

  const filtered = vehicles.filter((v) => {
    if (search) {
      const q = search.toLowerCase();
      if (!v.vehicle_number.toLowerCase().includes(q) &&
          !v.driver_name.toLowerCase().includes(q) &&
          !v.id.toLowerCase().includes(q)) return false;
    }
    if (statusFilter !== "all" && v.status !== statusFilter) return false;
    return true;
  });

  const handleUnload = async (v: DbVehicle) => {
    if (v.current_load_kg <= 0) {
      setFleetActionMessage(`Vehicle ${v.id} is already empty (0kg load).`);
      return;
    }

    const sendDriverSuggestion = async () => {
      if (!supabase) return;
      const message = "You can unload that thing at our facility.";
      const { error } = await supabase.from("alerts").insert({
        id: `ALERT-UNLOAD-${v.id}-${Date.now()}`,
        vehicle_id: v.id,
        type: "vehicle",
        severity: "info",
        message,
        is_read: false,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.warn("Could not send unload suggestion to driver dashboard:", error.message);
      }
    };

    setIsUnloading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_ML_API_URL || "http://localhost:8000";
      const { data: session } = supabase?.auth ? await supabase.auth.getSession() : { data: { session: null } };
      if (!session.session?.access_token) {
        await sendDriverSuggestion();
        setFleetActionMessage("Unload guidance has been sent to the assigned driver dashboard.");
        return;
      }

      const res = await fetch(`${baseUrl}/api/collections/unload`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          vehicle_id: v.id,
          facility_name: "Ahmedabad Municipal Waste Processing Facility",
          gross_weight_kg: v.current_load_kg + 3500.0,
          net_weight_kg: v.current_load_kg,
          accepted_waste_type: "Mixed Recyclable"
        })
      });

      if (res.ok) {
        await sendDriverSuggestion();
        setFleetActionMessage(`Unload request acknowledged for ${v.id}. A driver suggestion has been sent.`);
        refreshData();
        return;
      }

      await sendDriverSuggestion();
      const errText = await res.text().catch(() => "");
      setFleetActionMessage(errText ? `Unload guidance sent to driver: ${errText}` : "Unload guidance has been sent to the assigned driver dashboard.");
    } catch (e) {
      await sendDriverSuggestion();
      setFleetActionMessage("Unload guidance has been sent to the assigned driver dashboard.");
      console.warn("Unload fallback notification sent:", e);
    } finally {
      setIsUnloading(false);
    }
  };

  const registerVehicleAndDriver = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setRegistrationState("saving");
    setRegistrationMessage("");
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.access_token) { setRegistrationState("error"); setRegistrationMessage("Your supervisor session has expired."); return; }
    const response = await fetch("/api/supervisor/register-vehicle-driver", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.session.access_token}` }, body: JSON.stringify({ ...registration, capacity_kg: Number(registration.capacity_kg), latitude: Number(registration.latitude), longitude: Number(registration.longitude), supported_waste_streams: registration.supported_waste_streams.split(",").map((value) => value.trim()).filter(Boolean) }) });
    const result = await response.json();
    if (!response.ok) { setRegistrationState("error"); setRegistrationMessage(result.error ?? "Registration failed."); return; }
    setRegistrationState("success");
    setRegistrationMessage("Vehicle and driver registered. The driver must change the temporary password at first login.");
    setRegistration((current) => ({ ...current, vehicle_number: "", service_area: "", depot: "", existing_driver_id: "", driver_name: "", driver_email: "", driver_phone: "", temporary_password: "" }));
    refreshData();
  };

  const dispatchVehicle = async (vehicle: DbVehicle) => {
    if (!supabase) return;
    setFleetActionMessage(`Dispatching ${vehicle.id}...`);
    const { error } = await supabase
      .from("vehicles")
      .update({
        status: "collecting",
        last_updated: new Date().toISOString(),
      })
      .eq("id", vehicle.id);

    if (error) {
      setFleetActionMessage(`Dispatch failed: ${error.message}`);
      return;
    }

    setSelectedVehicle({ ...vehicle, status: "collecting", last_updated: new Date().toISOString() });
    setFleetActionMessage(`${vehicle.id} has been dispatched and is now active on collection.`);
    refreshData();
  };

  const trackVehicle = (vehicle: DbVehicle) => {
    setSelectedVehicle(vehicle);
    const utilization = Math.round((vehicle.current_load_kg / vehicle.capacity_kg) * 100);
    const mapUrl = `https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}&z=18&layer=c`;
    setFleetActionMessage(`Live GPS tracking for ${vehicle.id} at ${vehicle.latitude.toFixed(4)}, ${vehicle.longitude.toFixed(4)} · ${vehicle.current_load_kg}/${vehicle.capacity_kg} kg · ${utilization}% utilized.`);
    window.open(mapUrl, "_blank", "noopener,noreferrer");
  };

  // Summary stats
  const activeCount = vehicles.filter(v => v.status === "collecting" || v.status === "available").length;
  const maintenanceCount = vehicles.filter(v => v.status === "maintenance").length;
  const totalCapacity = vehicles.reduce((s, v) => s + v.capacity_kg, 0);
  const totalLoad = vehicles.reduce((s, v) => s + v.current_load_kg, 0);

  return (
    <>
      <Header title="Fleet Management" subtitle="Vehicle status and utilization" />

      <div className="space-y-6 p-6">
        <Card>
          <CardHeader><CardTitle className="text-base font-semibold">Register Vehicle and Driver</CardTitle><CardDescription>Create a separate driver account or attach an existing driver.</CardDescription></CardHeader>
          <CardContent>
            <form onSubmit={registerVehicleAndDriver} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Input required placeholder="Vehicle registration" value={registration.vehicle_number} onChange={(e) => setRegistration({ ...registration, vehicle_number: e.target.value })} />
              <Input required placeholder="Vehicle type" value={registration.vehicle_type} onChange={(e) => setRegistration({ ...registration, vehicle_type: e.target.value })} />
              <Input required type="number" min="1" placeholder="Capacity (kg)" value={registration.capacity_kg} onChange={(e) => setRegistration({ ...registration, capacity_kg: e.target.value })} />
              <Input required placeholder="Waste streams, comma separated" value={registration.supported_waste_streams} onChange={(e) => setRegistration({ ...registration, supported_waste_streams: e.target.value })} />
              <Input required placeholder="Operating area" value={registration.service_area} onChange={(e) => setRegistration({ ...registration, service_area: e.target.value })} />
              <Input required placeholder="Depot" value={registration.depot} onChange={(e) => setRegistration({ ...registration, depot: e.target.value })} />
              <Input required type="number" step="any" placeholder="Depot latitude" value={registration.latitude} onChange={(e) => setRegistration({ ...registration, latitude: e.target.value })} />
              <Input required type="number" step="any" placeholder="Depot longitude" value={registration.longitude} onChange={(e) => setRegistration({ ...registration, longitude: e.target.value })} />
              <Select value={registration.existing_driver_id} onValueChange={(value) => value && setRegistration({ ...registration, existing_driver_id: value, driver_name: "", driver_email: "", temporary_password: "" })}><SelectTrigger><SelectValue placeholder="Use existing driver" /></SelectTrigger><SelectContent>{drivers.map((driver) => <SelectItem key={driver.id} value={driver.id}>{driver.full_name ?? driver.driver_id ?? driver.id}</SelectItem>)}</SelectContent></Select>
              <Input placeholder="New driver name" value={registration.driver_name} disabled={Boolean(registration.existing_driver_id)} onChange={(e) => setRegistration({ ...registration, driver_name: e.target.value })} />
              <Input type="email" placeholder="New driver email" value={registration.driver_email} disabled={Boolean(registration.existing_driver_id)} onChange={(e) => setRegistration({ ...registration, driver_email: e.target.value })} />
              <Input type="password" placeholder="Temporary password" value={registration.temporary_password} disabled={Boolean(registration.existing_driver_id)} onChange={(e) => setRegistration({ ...registration, temporary_password: e.target.value })} />
              <div className="flex items-center gap-3 md:col-span-2 xl:col-span-4"><Button type="submit" disabled={registrationState === "saving"}>{registrationState === "saving" ? "Registering..." : "Register vehicle"}</Button>{registrationMessage && <p role={registrationState === "error" ? "alert" : "status"} className={`text-sm ${registrationState === "error" ? "text-red-600" : "text-green-700"}`}>{registrationMessage}</p>}</div>
            </form>
          </CardContent>
        </Card>
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Vehicles", value: vehicles.length, icon: <Truck className="h-5 w-5 text-blue-500" /> },
            { label: "Operational", value: activeCount, icon: <Truck className="h-5 w-5 text-green-500" /> },
            { label: "In Maintenance", value: maintenanceCount, icon: <Truck className="h-5 w-5 text-red-500" /> },
            { label: "Fleet Utilization", value: `${Math.round((totalLoad / totalCapacity) * 100)}%`, icon: <Package className="h-5 w-5 text-amber-500" /> },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                {stat.icon}
                <div>
                  <p className="text-xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Vehicle Fleet</CardTitle>
                <div className="flex gap-2 pt-1">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search vehicles…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={(val) => val && setStatusFilter(val)}>
                    <SelectTrigger className="w-[130px] h-8 text-xs">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="collecting">Collecting</SelectItem>
                      <SelectItem value="returning">Returning</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="px-0 pb-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-6">Vehicle</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="pr-6">Updated</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((v) => {
                      const pct = Math.round((v.current_load_kg / v.capacity_kg) * 100);
                      return (
                        <TableRow
                          key={v.id}
                          className={`cursor-pointer hover:bg-muted/30 ${selectedVehicle?.id === v.id ? "bg-muted/50" : ""}`}
                          onClick={() => setSelectedVehicle(v === selectedVehicle ? null : v)}
                        >
                          <TableCell className="pl-6">
                            <div>
                              <p className="font-mono text-xs font-semibold">{v.id}</p>
                              <p className="text-xs text-muted-foreground">{v.vehicle_number}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs">{v.driver_name}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-xs">{v.capacity_kg} kg</span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1 min-w-[80px]">
                              <div className="flex justify-between text-xs">
                                <span className="font-medium">{pct}%</span>
                                <span className="text-muted-foreground">{v.current_load_kg}kg</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${loadColor(pct)}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{vehicleStatusBadge(v.status)}</TableCell>
                          <TableCell className="pr-6">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {timeAgo(v.last_updated)}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Vehicle detail panel */}
          <div>
            {selectedVehicle ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{selectedVehicle.id}</CardTitle>
                  <CardDescription>{selectedVehicle.vehicle_number} · {selectedVehicle.vehicle_type}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {vehicleStatusBadge(selectedVehicle.status)}

                  <div className="space-y-3">
                    {[
                      { label: "Driver", value: selectedVehicle.driver_name, icon: <User className="h-3.5 w-3.5" /> },
                      { label: "Type", value: selectedVehicle.vehicle_type, icon: <Truck className="h-3.5 w-3.5" /> },
                      { label: "Location", value: `${selectedVehicle.latitude.toFixed(4)}, ${selectedVehicle.longitude.toFixed(4)}`, icon: <MapPin className="h-3.5 w-3.5" /> },
                      { label: "Last Updated", value: timeAgo(selectedVehicle.last_updated), icon: <Clock className="h-3.5 w-3.5" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="text-muted-foreground">{row.icon}</span>
                        <div>
                          <p className="text-[11px] text-muted-foreground">{row.label}</p>
                          <p className="text-sm font-medium">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-muted-foreground">Load</span>
                      <span className="font-medium">
                        {selectedVehicle.current_load_kg} / {selectedVehicle.capacity_kg} kg
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full ${loadColor(Math.round((selectedVehicle.current_load_kg / selectedVehicle.capacity_kg) * 100))}`}
                        style={{ width: `${Math.round((selectedVehicle.current_load_kg / selectedVehicle.capacity_kg) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 text-right">
                      {Math.round((selectedVehicle.current_load_kg / selectedVehicle.capacity_kg) * 100)}% utilized
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 text-xs" onClick={() => void dispatchVehicle(selectedVehicle)}>Dispatch</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => trackVehicle(selectedVehicle)}>Track</Button>
                    </div>
                    {fleetActionMessage && (
                      <p className="rounded-md border border-blue-500/20 bg-blue-500/5 px-2 py-1.5 text-[11px] text-blue-700 dark:text-blue-300">
                        {fleetActionMessage}
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="secondary"
                      className="w-full text-xs font-semibold text-brand border border-brand/20 bg-brand/10 hover:bg-brand/20"
                      disabled={isUnloading || selectedVehicle.current_load_kg <= 0}
                      onClick={() => handleUnload(selectedVehicle)}
                    >
                      {isUnloading ? "Unloading..." : `Unload ${selectedVehicle.current_load_kg}kg at Facility`}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a vehicle to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
