"use client";

import { useAppData } from "@/components/providers/app-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, MapPin, Truck } from "lucide-react";
import type { PriorityCategory } from "@/lib/db-types";
import { getPriorityCategory } from "@/lib/services/priority-engine";

function priorityBadge(score: number) {
  const cat = getPriorityCategory(score);
  const styles: Record<PriorityCategory, string> = {
    critical: "bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20",
    high: "bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20",
    medium: "bg-yellow-500/10 text-yellow-700 border-yellow-200 hover:bg-yellow-500/20",
    low: "bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20",
  };
  const labels: Record<PriorityCategory, string> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low",
  };
  return (
    <Badge className={styles[cat]}>
      {labels[cat]} · {score}
    </Badge>
  );
}

function fillColor(level: number) {
  if (level >= 80) return "bg-red-500";
  if (level >= 50) return "bg-amber-500";
  return "bg-green-500";
}

interface CollectionPriorityProps {
  onFocusBin?: (binId: string) => void;
}

export function CollectionPriority({ onFocusBin }: CollectionPriorityProps) {
  const { priorityBins } = useAppData();

  const top8 = priorityBins.slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Collection Priority
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Bins ranked by AI urgency score — highest priority first
        </p>
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-6 w-[80px]">Bin</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[140px]">Fill Level</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="w-[90px]">Overflow</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead className="pr-6 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top8.map((bin) => (
                <TableRow
                  key={bin.bin_id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="pl-6">
                    <span className="font-mono text-xs font-semibold">{bin.bin_id}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                      {bin.location_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1 min-w-[100px]">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">
                          {bin.fill_percentage}%
                        </span>
                        <span className="text-muted-foreground">
                          {Math.round(bin.overflow_probability * 100)}% prob
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fillColor(bin.fill_percentage)}`}
                          style={{ width: `${bin.fill_percentage}%` }}
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs">{bin.waste_type}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium">
                        {bin.predicted_full_hours < 2
                          ? `${Math.round(bin.predicted_full_hours * 60)}m`
                          : `${bin.predicted_full_hours}h`}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{priorityBadge(bin.priority_score)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="flex justify-end gap-1">
                      {onFocusBin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => onFocusBin(bin.bin_id)}
                        >
                          <MapPin className="h-3 w-3 mr-1" />
                          Map
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                      >
                        <Truck className="h-3 w-3 mr-1" />
                        Collect
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
