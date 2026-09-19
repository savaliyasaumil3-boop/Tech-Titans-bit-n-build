"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { vehicles as initialVehicles } from "@/lib/mock-data";
import type { Vehicle, VehicleStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Fuel,
  MapPin,
  Clock,
  Search,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Navigation,
  RefreshCw,
} from "lucide-react";

function vehicleStatusBadge(status: VehicleStatus) {
  switch (status) {
    case "active":
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[11px] font-medium">
          Active
        </Badge>
      );
    case "idle":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[11px] font-medium">
          Idle
        </Badge>
      );
    case "maintenance":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[11px] font-medium">
          Maintenance
        </Badge>
      );
  }
}

function fuelColor(level: number) {
  if (level <= 25) return "bg-red-500";
  if (level <= 50) return "bg-amber-500";
  return "bg-green-500";
}

function loadColor(percentage: number) {
  if (percentage >= 85) return "bg-red-500";
  if (percentage >= 60) return "bg-amber-500";
  return "bg-primary";
}

export default function VehiclesPage() {
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>(initialVehicles);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | "all">("all");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const totalVehicles = vehiclesList.length;
  const activeCount = vehiclesList.filter((v) => v.status === "active").length;
  const totalLoad = vehiclesList
    .reduce((acc, v) => acc + v.currentLoad, 0)
    .toFixed(1);
  const avgFuel = Math.round(
    vehiclesList.reduce((acc, v) => acc + v.fuelLevel, 0) / (totalVehicles || 1)
  );

  const filtered = vehiclesList.filter((v) => {
    const matchesSearch =
      search === "" ||
      v.id.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.driver.toLowerCase().includes(search.toLowerCase()) ||
      v.route.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <Header
        title="Fleet Management"
        subtitle="Live GPS tracking, vehicle load telemetrics, and route dispatches"
      />

      <div className="space-y-6 p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Truck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Vehicles</p>
                <p className="text-xl font-bold tracking-tight">{totalVehicles}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Municipal EV & Diesel Fleet</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-green-500/10 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Active On Route</p>
                <p className="text-xl font-bold tracking-tight text-green-600">
                  {activeCount} <span className="text-xs font-normal text-muted-foreground">/ {totalVehicles}</span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Live collection in progress</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                <Navigation className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Current Payload</p>
                <p className="text-xl font-bold tracking-tight text-blue-600">{totalLoad} Tons</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">En route to processing center</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                <Fuel className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Avg Fleet Fuel / Battery</p>
                <p className="text-xl font-bold tracking-tight text-amber-600">{avgFuel}%</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">All above threshold</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 shadow-none">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID, vehicle name, driver, or route…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as VehicleStatus | "all")}
            >
              <SelectTrigger className="w-[180px] h-9 text-sm">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Fleet Table */}
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-4 w-[120px]">Vehicle ID</TableHead>
                <TableHead>Driver & Vehicle</TableHead>
                <TableHead>Assigned Route</TableHead>
                <TableHead className="w-[100px]">Status</TableHead>
                <TableHead className="w-[150px]">Current Load</TableHead>
                <TableHead className="w-[130px]">Fuel / Battery</TableHead>
                <TableHead>Last Activity</TableHead>
                <TableHead className="pr-4 text-right w-[110px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No vehicles found matching current criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((v) => {
                  const loadPercent = Math.round((v.currentLoad / v.capacity) * 100);
                  return (
                    <TableRow key={v.id} className="hover:bg-muted/50">
                      <TableCell className="pl-4 font-mono text-xs font-semibold">
                        {v.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-muted-foreground">{v.driver}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="truncate max-w-[220px]">{v.route}</span>
                        </div>
                      </TableCell>
                      <TableCell>{vehicleStatusBadge(v.status)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span>{v.currentLoad} / {v.capacity} T</span>
                            <span className="text-muted-foreground">{loadPercent}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${loadColor(loadPercent)}`}
                              style={{ width: `${loadPercent}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="flex items-center gap-1">
                              <Fuel className="h-3 w-3 text-muted-foreground" />
                              {v.fuelLevel}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${fuelColor(v.fuelLevel)}`}
                              style={{ width: `${v.fuelLevel}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(v.lastCollection).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="pr-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setSelectedVehicle(v)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Selected Vehicle Detail Card if clicked */}
        {selectedVehicle && (
          <Card className="border-primary/30 shadow-none">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <span>{selectedVehicle.name}</span>
                    <span className="font-mono text-xs font-normal text-muted-foreground">
                      ({selectedVehicle.id})
                    </span>
                    {vehicleStatusBadge(selectedVehicle.status)}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Driver: {selectedVehicle.driver} · Location: {selectedVehicle.lat.toFixed(4)}, {selectedVehicle.lng.toFixed(4)}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVehicle(null)}
                  className="text-xs"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">Assigned Route</p>
                  <p className="text-sm font-semibold mt-1">{selectedVehicle.route}</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">Current Load</p>
                  <p className="text-sm font-semibold mt-1">
                    {selectedVehicle.currentLoad} Tons / {selectedVehicle.capacity} Tons capacity
                  </p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">Fuel / Battery Status</p>
                  <p className="text-sm font-semibold mt-1">{selectedVehicle.fuelLevel}% remaining</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
