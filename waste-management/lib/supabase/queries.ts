import { supabase, isDemoMode } from "./client";
import {
  demoBins,
  demoVehicles,
  demoAlerts,
  demoPredictions,
} from "./demo-data";
import type {
  DbBin,
  DbVehicle,
  DbAlert,
  DbPrediction,
  DbWasteRecord,
} from "../db-types";

const isSafeDemoMode = isDemoMode || !supabase;

// ─── Bins ────────────────────────────────────────────────────────────────────

export async function getBins(): Promise<DbBin[]> {
  if (isSafeDemoMode || !supabase) return demoBins;
  const { data, error } = await supabase
    .from("bins")
    .select("*")
    .order("priority_score", { ascending: false });
  if (error) {
    console.error("getBins error:", error);
    return [];
  }
  return data ?? [];
}

export async function getBinById(id: string): Promise<DbBin | null> {
  if (isSafeDemoMode || !supabase) return demoBins.find((b) => b.id === id) ?? null;
  const { data, error } = await supabase
    .from("bins")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getBinById error:", error);
    return null;
  }
  return data;
}

export async function updateBin(
  id: string,
  updates: Partial<DbBin>
): Promise<DbBin | null> {
  if (isSafeDemoMode || !supabase) {
    const bin = demoBins.find((b) => b.id === id);
    return bin ? { ...bin, ...updates } : null;
  }
  const { data, error } = await supabase
    .from("bins")
    .update({ ...updates, last_updated: new Date().toISOString() })
    .eq("id", id)
    .select()
    .maybeSingle();
  if (error) {
    console.error("updateBin error:", error);
    return null;
  }
  return data;
}

// ─── Vehicles ────────────────────────────────────────────────────────────────

export async function getVehicles(): Promise<DbVehicle[]> {
  if (isSafeDemoMode || !supabase) return demoVehicles;
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("id");
  if (error) {
    console.error("getVehicles error:", error);
    return [];
  }
  return data ?? [];
}

export async function getVehicleById(id: string): Promise<DbVehicle | null> {
  if (isSafeDemoMode || !supabase) return demoVehicles.find((v) => v.id === id) ?? null;
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getVehicleById error:", error);
    return null;
  }
  return data;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<DbAlert[]> {
  if (isSafeDemoMode || !supabase) return demoAlerts;
  const { data, error } = await supabase
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAlerts error:", error);
    return [];
  }
  return data ?? [];
}

export async function markAlertRead(id: string): Promise<void> {
  if (isSafeDemoMode || !supabase) return;
  const { error } = await supabase.from("alerts").update({ is_read: true }).eq("id", id);
  if (error) {
    console.error("markAlertRead error:", error);
  }
}

// ─── Waste History ───────────────────────────────────────────────────────────

export async function getWasteHistory(
  binId?: string,
  days = 30
): Promise<DbWasteRecord[]> {
  if (isSafeDemoMode || !supabase) {
    const { demoWasteRecords } = await import("./demo-data");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return demoWasteRecords.filter((r) => {
      if (binId && r.bin_id !== binId) return false;
      return new Date(r.recorded_at) >= cutoff;
    });
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let query = supabase
    .from("waste_records")
    .select("*")
    .gte("recorded_at", cutoff.toISOString())
    .order("recorded_at", { ascending: false });
  if (binId) query = query.eq("bin_id", binId);
  const { data, error } = await query;
  if (error) {
    console.error("getWasteHistory error:", error);
    return [];
  }
  return data ?? [];
}

// ─── Collections ─────────────────────────────────────────────────────────────

export async function getCollections(days = 7) {
  if (isSafeDemoMode || !supabase) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data, error } = await supabase
    .from("collections")
    .select("*")
    .gte("collected_at", cutoff.toISOString())
    .order("collected_at", { ascending: false });
  if (error) {
    console.error("getCollections error:", error);
    return [];
  }
  return data ?? [];
}

// ─── Predictions ─────────────────────────────────────────────────────────────

export async function getPredictions(): Promise<DbPrediction[]> {
  if (isSafeDemoMode || !supabase) return demoPredictions;
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .order("prediction_created_at", { ascending: false });
  if (error) {
    console.error("getPredictions error:", error);
    return [];
  }
  return data ?? [];
}

export async function getPredictionForBin(
  binId: string
): Promise<DbPrediction | null> {
  if (isSafeDemoMode || !supabase) return demoPredictions.find((p) => p.bin_id === binId) ?? null;
  const { data, error } = await supabase
    .from("predictions")
    .select("*")
    .eq("bin_id", binId)
    .order("prediction_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getPredictionForBin error:", error);
    return null;
  }
  return data;
}
