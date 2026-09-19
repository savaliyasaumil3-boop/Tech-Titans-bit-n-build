"use client";

import { useLiveData } from "@/components/providers/live-data-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Clock, Truck } from "lucide-react";

function priorityBadge(score: number) {
  if (score >= 80)
    return (
      <Badge className="bg-red-500/10 text-red-600 border-red-200 hover:bg-red-500/20">
        Critical
      </Badge>
    );
  if (score >= 60)
    return (
      <Badge className="bg-amber-500/10 text-amber-600 border-amber-200 hover:bg-amber-500/20">
        High
      </Badge>
    );
  if (score >= 40)
    return (
      <Badge className="bg-yellow-500/10 text-yellow-700 border-yellow-200 hover:bg-yellow-500/20">
        Medium
      </Badge>
    );
  return (
    <Badge className="bg-green-500/10 text-green-600 border-green-200 hover:bg-green-500/20">
      Low
    </Badge>
  );
}

function fillColor(level: number) {
  if (level >= 80) return "bg-red-500";
  if (level >= 50) return "bg-amber-500";
  return "bg-green-500";
}

export function CollectionPriority() {
  const { bins } = useLiveData();

  const sorted = [...bins]
    .sort((a, b) => b.priorityScore - a.priorityScore)
    .slice(0, 8);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold tracking-tight">
          Collection Priority
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Bins ranked by urgency — highest priority first
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
              {sorted.map((bin) => (
                <TableRow key={bin.id}>
                  <TableCell className="pl-6 font-mono text-xs">
                    {bin.id}
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {bin.locationName}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${fillColor(bin.fillLevel)}`}
                          style={{ width: `${bin.fillLevel}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium tabular-nums w-[36px] text-right">
                        {bin.fillLevel}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {bin.wasteType}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {bin.predictedFullHours}h
                    </div>
                  </TableCell>
                  <TableCell>{priorityBadge(bin.priorityScore)}</TableCell>
                  <TableCell className="pr-6 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs gap-1"
                    >
                      <Truck className="h-3 w-3" />
                      Collect
                    </Button>
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
