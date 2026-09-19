"use client";

import { useState, useMemo } from "react";
import type { BinStatus, WasteType } from "@/lib/types";
import type { DbBin } from "@/lib/db-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Eye, Truck } from "lucide-react";
import { BinDetailsDrawer } from "./bin-details-drawer";

interface BinsTableProps {
  bins: DbBin[];
  search: string;
  statusFilter: BinStatus | "all";
  wasteTypeFilter: WasteType | "all";
}

function statusBadge(status: BinStatus) {
  switch (status) {
    case "critical":
      return (
        <Badge className="bg-red-500/10 text-red-600 border-red-200 text-[11px]">
          Critical
        </Badge>
      );
    case "warning":
      return (
        <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 text-[11px]">
          Warning
        </Badge>
      );
    default:
      return (
        <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[11px]">
          Healthy
        </Badge>
      );
  }
}

function fillColor(level: number) {
  if (level >= 80) return "bg-red-500";
  if (level >= 50) return "bg-amber-500";
  return "bg-green-500";
}

export function BinsTable({
  bins,
  search,
  statusFilter,
  wasteTypeFilter,
}: BinsTableProps) {
  const [selectedBin, setSelectedBin] = useState<DbBin | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return bins.filter((bin) => {
      const matchesSearch =
        search === "" ||
        bin.id.toLowerCase().includes(search.toLowerCase()) ||
        bin.location_name.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || bin.status === statusFilter;

      const matchesType =
        wasteTypeFilter === "all" || bin.waste_type === wasteTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [bins, search, statusFilter, wasteTypeFilter]);

  function openDetails(bin: DbBin) {
    setSelectedBin(bin);
    setDrawerOpen(true);
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="pl-4 w-[90px]">Bin ID</TableHead>
              <TableHead>Location</TableHead>
              <TableHead className="w-[140px]">Fill Level</TableHead>
              <TableHead className="w-[80px]">Capacity</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="w-[80px]">Status</TableHead>
              <TableHead className="w-[80px]">Overflow</TableHead>
              <TableHead>Last Updated</TableHead>
              <TableHead className="pr-4 text-right w-[110px]">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-12"
                >
                  No bins match the current filters.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((bin) => (
                <TableRow
                  key={bin.id}
                  className="cursor-pointer"
                  onClick={() => openDetails(bin)}
                >
                  <TableCell className="pl-4 font-mono text-xs">
                    {bin.id}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">
                        {bin.location_name}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${fillColor(bin.fill_percentage)}`}
                          style={{ width: `${bin.fill_percentage}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-[36px] text-right">
                        {bin.fill_percentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {bin.capacity_kg}kg
                  </TableCell>
                  <TableCell className="text-xs">{bin.waste_type}</TableCell>
                  <TableCell>{statusBadge(bin.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {bin.predicted_full_hours}h
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground" suppressHydrationWarning>
                    {new Date(bin.last_updated).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell className="pr-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(bin);
                        }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDetails(bin);
                        }}
                      >
                        <Truck className="h-3 w-3" />
                        Collect
                      </Button>

                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <BinDetailsDrawer
        bin={selectedBin}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </>
  );
}
