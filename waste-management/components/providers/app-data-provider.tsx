"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { DbBin, DbVehicle, DbAlert, DbPrediction, PriorityBin } from "@/lib/db-types";
import type { BinStatus } from "@/lib/types";
import { demoBins, demoVehicles, demoAlerts, demoPredictions } from "@/lib/supabase/demo-data";
import { buildPriorityBins, estimateOverflowProbability } from "@/lib/services/priority-engine";
import { getBins, getVehicles, getAlerts, getPredictions, markAlertRead } from "@/lib/supabase/queries";
import { supabase, isDemoMode as configDemoMode } from "@/lib/supabase/client";

// ─── Context Shape ────────────────────────────────────────────────────────────

interface AppDataContextValue {
  // Bins
  bins: DbBin[];
  priorityBins: PriorityBin[];
  // Vehicles
  vehicles: DbVehicle[];
  // Alerts
  alerts: DbAlert[];
  // Predictions
  predictions: DbPrediction[];
  // Live state
  isLive: boolean;
  setIsLive: (v: boolean) => void;
  lastUpdated: Date;
  isDemoMode: boolean;
  // Actions
  resolveAlert: (id: string) => void;
  refreshData: () => void;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(fill: number): BinStatus {
  if (fill >= 80) return "critical";
  if (fill >= 50) return "warning";
  return "healthy";
}

function getPredictedFullHours(fill: number, capacityKg: number): number {
  const avgHourlyKg = (capacityKg * 0.015); // ~1.5% per hour base rate
  const remaining = capacityKg * (1 - fill / 100);
  return Math.max(1, Math.round((remaining / avgHourlyKg) * 10) / 10);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [bins, setBins] = useState<DbBin[]>(demoBins);
  const [vehicles, setVehicles] = useState<DbVehicle[]>(demoVehicles);
  const [alerts, setAlerts] = useState<DbAlert[]>(demoAlerts);
  const [predictions, setPredictions] = useState<DbPrediction[]>(demoPredictions);
  const [isLive, setIsLive] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const alertCounterRef = useRef(100);

  const priorityBins = buildPriorityBins(bins, predictions);

  // ── Initial load from Supabase / Backend when not in demo mode ────────────
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      if (configDemoMode) return;
      try {
        const [fetchedBins, fetchedVehicles, fetchedAlerts, fetchedPredictions] =
          await Promise.all([
            getBins(),
            getVehicles(),
            getAlerts(),
            getPredictions(),
          ]);

        if (isMounted) {
          if (fetchedBins.length > 0) setBins(fetchedBins);
          if (fetchedVehicles.length > 0) setVehicles(fetchedVehicles);
          if (fetchedAlerts.length > 0) setAlerts(fetchedAlerts);
          if (fetchedPredictions.length > 0) setPredictions(fetchedPredictions);
          setLastUpdated(new Date());
        }
      } catch (err) {
        console.error("Error fetching live data from Supabase:", err);
      }
    }

    loadData();

    // Setup Supabase Realtime Subscription if client is available
    if (supabase && !configDemoMode) {
      const channel = supabase
        .channel("realtime-swachhsetu")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "bins" },
          (payload) => {
            if (payload.eventType === "UPDATE") {
              setBins((prev) =>
                prev.map((b) => (b.id === payload.new.id ? (payload.new as DbBin) : b))
              );
              setLastUpdated(new Date());
            } else if (payload.eventType === "INSERT") {
              setBins((prev) => [payload.new as DbBin, ...prev]);
              setLastUpdated(new Date());
            }
          }
        )
        .subscribe();

      return () => {
        isMounted = false;
        supabase?.removeChannel(channel);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // ── Simulate bin fill updates every 20-30 seconds ──────────────────────────
  const simulateUpdate = useCallback(() => {
    setBins((prev) => {
      const updated = [...prev];
      // Pick 3-5 random bins
      const count = 3 + Math.floor(Math.random() * 3);
      const indices = new Set<number>();
      while (indices.size < Math.min(count, updated.length)) {
        indices.add(Math.floor(Math.random() * updated.length));
      }

      const newAlerts: DbAlert[] = [];

      for (const idx of indices) {
        const bin = { ...updated[idx] };
        const wasStatus = bin.status;

        // 85% chance fill increase (1-4%), 15% chance decrease (collection event)
        const isCollection = Math.random() < 0.15;
        if (isCollection) {
          bin.fill_percentage = Math.max(5, bin.fill_percentage - (20 + Math.floor(Math.random() * 30)));
        } else {
          const increase = 1 + Math.floor(Math.random() * 4);
          bin.fill_percentage = Math.min(100, bin.fill_percentage + increase);
        }

        bin.current_fill_kg = Math.round((bin.fill_percentage / 100) * bin.capacity_kg);
        bin.status = getStatus(bin.fill_percentage);
        bin.predicted_full_hours = getPredictedFullHours(bin.fill_percentage, bin.capacity_kg);
        bin.last_updated = new Date().toISOString();

        updated[idx] = bin;

        // Generate alert if bin became critical
        if (wasStatus !== "critical" && bin.status === "critical") {
          alertCounterRef.current += 1;
          newAlerts.push({
            id: `ALT-LIVE-${alertCounterRef.current}`,
            bin_id: bin.id,
            vehicle_id: null,
            type: "overflow",
            severity: "critical",
            message: `${bin.id} at ${bin.location_name} reached ${bin.fill_percentage}% — immediate collection needed`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
        // Warning alert
        if (wasStatus === "healthy" && bin.status === "warning") {
          alertCounterRef.current += 1;
          newAlerts.push({
            id: `ALT-LIVE-${alertCounterRef.current}`,
            bin_id: bin.id,
            vehicle_id: null,
            type: "overflow",
            severity: "warning",
            message: `${bin.id} at ${bin.location_name} reached warning level (${bin.fill_percentage}%)`,
            is_read: false,
            created_at: new Date().toISOString(),
          });
        }
      }

      if (newAlerts.length > 0) {
        setAlerts((a) => [...newAlerts, ...a].slice(0, 50)); // cap at 50 alerts
      }

      return updated;
    });

    // Also update predictions
    setPredictions((prev) =>
      prev.map((p) => {
        // Find from latest updated bins if possible
        const bin = bins.find((b) => b.id === p.bin_id);
        if (!bin) return p;
        return {
          ...p,
          overflow_probability: estimateOverflowProbability(bin.fill_percentage),
          prediction_created_at: new Date().toISOString(),
        };
      })
    );

    setLastUpdated(new Date());
  }, [bins]);

  useEffect(() => {
    if (!isLive) return;
    const delay = (20 + Math.floor(Math.random() * 11)) * 1000; // 20-30s
    const timer = setTimeout(simulateUpdate, delay);
    return () => clearTimeout(timer);
  }, [isLive, simulateUpdate]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const resolveAlert = useCallback((id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, is_read: true } : a))
    );
    if (!configDemoMode) {
      markAlertRead(id).catch((e) => console.error("Error marking alert as read:", e));
    }
  }, []);

  const refreshData = useCallback(() => {
    setLastUpdated(new Date());
  }, []);

  return (
    <AppDataContext.Provider
      value={{
        bins,
        priorityBins,
        vehicles,
        alerts,
        predictions,
        isLive,
        setIsLive,
        lastUpdated,
        isDemoMode: configDemoMode,
        resolveAlert,
        refreshData,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error("useAppData must be used within AppDataProvider");
  return ctx;
}
