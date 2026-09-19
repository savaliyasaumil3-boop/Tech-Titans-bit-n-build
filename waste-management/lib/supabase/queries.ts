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

// ─── Bins ────────────────────────────────────────────────────────────────────

export async function getBins(): Promise<DbBin[]> {
  if (isDemoMode) return demoBins;
  const { data, error } = await supabase!
    .from("bins")
    .select("*")
    .order("priority_score", { ascending: false });
  if (error) {
    console.error("getBins error:", error);
    return demoBins;
  }
  return data ?? demoBins;
}

export async function getBinById(id: string): Promise<DbBin | null> {
  if (isDemoMode) return demoBins.find((b) => b.id === id) ?? null;
  const { data, error } = await supabase!
    .from("bins")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getBinById error:", error);
    return demoBins.find((b) => b.id === id) ?? null;
  }
  return data;
}

export async function updateBin(
  id: string,
  updates: Partial<DbBin>
): Promise<DbBin | null> {
  if (isDemoMode) {
    // In demo mode, just return merged bin (caller handles state)
    const bin = demoBins.find((b) => b.id === id);
    return bin ? { ...bin, ...updates } : null;
  }
  const { data, error } = await supabase!
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
  if (isDemoMode) return demoVehicles;
  const { data, error } = await supabase!
    .from("vehicles")
    .select("*")
    .order("id");
  if (error) {
    console.error("getVehicles error:", error);
    return demoVehicles;
  }
  return data ?? demoVehicles;
}

export async function getVehicleById(id: string): Promise<DbVehicle | null> {
  if (isDemoMode) return demoVehicles.find((v) => v.id === id) ?? null;
  const { data, error } = await supabase!
    .from("vehicles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("getVehicleById error:", error);
    return demoVehicles.find((v) => v.id === id) ?? null;
  }
  return data;
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

export async function getAlerts(): Promise<DbAlert[]> {
  if (isDemoMode) return demoAlerts;
  const { data, error } = await supabase!
    .from("alerts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getAlerts error:", error);
    return demoAlerts;
  }
  return data ?? demoAlerts;
}

export async function markAlertRead(id: string): Promise<void> {
  if (isDemoMode) return;
  await supabase!.from("alerts").update({ is_read: true }).eq("id", id);
}

// ─── Waste History ───────────────────────────────────────────────────────────

export async function getWasteHistory(
  binId?: string,
  days = 30
): Promise<DbWasteRecord[]> {
  if (isDemoMode) {
    // Import demo records lazily
    const { demoWasteRecords } = await import("./demo-data");
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const filtered = demoWasteRecords.filter((r) => {
      if (binId && r.bin_id !== binId) return false;
      return new Date(r.recorded_at) >= cutoff;
    });
    return filtered;
  }
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  let query = supabase!
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
  if (isDemoMode) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const { data, error } = await supabase!
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
  if (isDemoMode) return demoPredictions;
  const { data, error } = await supabase!
    .from("predictions")
    .select("*")
    .order("prediction_created_at", { ascending: false });
  if (error) {
    console.error("getPredictions error:", error);
    return demoPredictions;
  }
  return data ?? demoPredictions;
}

export async function getPredictionForBin(
  binId: string
): Promise<DbPrediction | null> {
  if (isDemoMode) return demoPredictions.find((p) => p.bin_id === binId) ?? null;
  const { data, error } = await supabase!
    .from("predictions")
    .select("*")
    .eq("bin_id", binId)
    .order("prediction_created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("getPredictionForBin error:", error);
    return demoPredictions.find((p) => p.bin_id === binId) ?? null;
  }
  return data;
}
