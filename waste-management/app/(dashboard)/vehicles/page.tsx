"use client";

import { useState } from "react";
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
  const { vehicles } = useAppData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<DbVehicle | null>(null);

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

  // Summary stats
  const activeCount = vehicles.filter(v => v.status === "collecting" || v.status === "available").length;
  const maintenanceCount = vehicles.filter(v => v.status === "maintenance").length;
  const totalCapacity = vehicles.reduce((s, v) => s + v.capacity_kg, 0);
  const totalLoad = vehicles.reduce((s, v) => s + v.current_load_kg, 0);

  return (
    <>
      <Header title="Fleet Management" subtitle="Vehicle status and utilization" />

      <div className="space-y-6 p-6">
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

                  <div className="pt-2 flex gap-2">
                    <Button size="sm" className="flex-1 text-xs">Dispatch</Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs">Track</Button>
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
