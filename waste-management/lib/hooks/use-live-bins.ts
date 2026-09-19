"use client";

import { useState, useEffect, useCallback } from "react";
import type { SmartBin, BinStatus } from "@/lib/types";

function getStatus(fillLevel: number): BinStatus {
  if (fillLevel >= 80) return "critical";
  if (fillLevel >= 50) return "warning";
  return "healthy";
}

function getPredictedFullHours(fillLevel: number): number {
  if (fillLevel >= 95) return 1;
  if (fillLevel >= 80) return Math.floor(Math.random() * 4) + 2;
  if (fillLevel >= 50) return Math.floor(Math.random() * 12) + 6;
  return Math.floor(Math.random() * 24) + 12;
}

function getPriorityScore(fillLevel: number): number {
  if (fillLevel >= 90) return Math.floor(Math.random() * 10) + 90;
  if (fillLevel >= 80) return Math.floor(Math.random() * 10) + 80;
  if (fillLevel >= 60) return Math.floor(Math.random() * 20) + 50;
  if (fillLevel >= 40) return Math.floor(Math.random() * 20) + 25;
  return Math.floor(Math.random() * 20) + 5;
}

export function useLiveBins(initialBins: SmartBin[]) {
  const [bins, setBins] = useState<SmartBin[]>(initialBins);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isLive, setIsLive] = useState(true);

  const simulateUpdate = useCallback(() => {
    setBins((prev) => {
      const updated = [...prev];
      if (updated.length === 0) return prev;
      // Randomly pick 2-4 bins to update
      const count = Math.min(updated.length, Math.floor(Math.random() * 3) + 2);
      const indices = new Set<number>();

      while (indices.size < count) {
        indices.add(Math.floor(Math.random() * updated.length));
      }

      for (const idx of indices) {
        const bin = { ...updated[idx] };
        // Increase fill level by 1-5%, occasionally decrease (collection event)
        const change = Math.random() > 0.15
          ? Math.floor(Math.random() * 5) + 1
          : -(Math.floor(Math.random() * 30) + 20);

        bin.fillLevel = Math.max(0, Math.min(100, bin.fillLevel + change));
        bin.status = getStatus(bin.fillLevel);
        bin.predictedFullHours = getPredictedFullHours(bin.fillLevel);
        bin.priorityScore = getPriorityScore(bin.fillLevel);
        bin.lastUpdated = new Date().toISOString();

        updated[idx] = bin;
      }

      return updated;
    });

    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    if (!isLive) return;

    // Random interval between 15-30 seconds
    const interval = setInterval(
      simulateUpdate,
      (Math.floor(Math.random() * 16) + 15) * 1000
    );

    return () => clearInterval(interval);
  }, [isLive, simulateUpdate]);

  return { bins, lastUpdated, isLive, setIsLive };
}
