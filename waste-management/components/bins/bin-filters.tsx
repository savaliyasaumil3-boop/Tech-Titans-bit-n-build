"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BinStatus, WasteType } from "@/lib/types";

interface BinFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: BinStatus | "all";
  onStatusChange: (value: BinStatus | "all") => void;
  wasteTypeFilter: WasteType | "all";
  onWasteTypeChange: (value: WasteType | "all") => void;
}

export function BinFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  wasteTypeFilter,
  onWasteTypeChange,
}: BinFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by ID or location…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      {/* Status filter */}
      <Select
        value={statusFilter}
        onValueChange={(v) => onStatusChange(v as BinStatus | "all")}
      >
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="healthy">Healthy</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
          <SelectItem value="picked_up">Picked Up</SelectItem>
        </SelectContent>
      </Select>

      {/* Waste type filter */}
      <Select
        value={wasteTypeFilter}
        onValueChange={(v) => onWasteTypeChange(v as WasteType | "all")}
      >
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="All Types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="Plastic">Plastic</SelectItem>
          <SelectItem value="Paper">Paper</SelectItem>
          <SelectItem value="Metal">Metal</SelectItem>
          <SelectItem value="Glass">Glass</SelectItem>
          <SelectItem value="Organic">Organic</SelectItem>
          <SelectItem value="E-Waste">E-Waste</SelectItem>
          <SelectItem value="Other">Other</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
