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
  DbWasteClassification,
  WasteCategory,
  ClassificationPrediction,
  ClassificationStats,
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

// ─── Waste Classifications ────────────────────────────────────────────────────

export async function saveClassification(
  result: Omit<DbWasteClassification, "id" | "created_at">
): Promise<DbWasteClassification | null> {
  if (isSafeDemoMode || !supabase) return null;
  try {
    const { data, error } = await supabase
      .from("waste_classifications")
      .insert({
        predicted_class: result.predicted_class,
        confidence: result.confidence,
        top_predictions: result.top_predictions,
        is_confident: result.is_confident,
        is_demo_mode: result.is_demo_mode,
        image_url: result.image_url ?? null,
      })
      .select()
      .maybeSingle();
    if (error) {
      console.warn("saveClassification error:", error);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export async function getClassificationHistory(
  filter?: WasteCategory | "All",
  limit = 50
): Promise<DbWasteClassification[]> {
  if (isSafeDemoMode || !supabase) return [];
  try {
    let query = supabase
      .from("waste_classifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (filter && filter !== "All") {
      query = query.eq("predicted_class", filter);
    }
    const { data, error } = await query;
    if (error) {
      console.warn("getClassificationHistory error:", error);
      return [];
    }
    return data ?? [];
  } catch {
    return [];
  }
}

export async function getClassificationStats(): Promise<ClassificationStats> {
  const empty: ClassificationStats = {
    total: 0,
    avg_confidence: 0,
    most_detected: null,
    today_count: 0,
    distribution: {},
  };

  if (isSafeDemoMode || !supabase) return empty;

  try {
    const { data, error } = await supabase
      .from("waste_classifications")
      .select("predicted_class, confidence, created_at");

    if (error || !data || data.length === 0) return empty;

    const total = data.length;
    const avg_confidence = data.reduce((s, r) => s + (r.confidence ?? 0), 0) / total;

    // Distribution count
    const dist: Record<string, number> = {};
    for (const row of data) {
      const cls = row.predicted_class as string;
      dist[cls] = (dist[cls] ?? 0) + 1;
    }
    const most_detected = (Object.entries(dist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null) as WasteCategory | null;

    // Today count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today_count = data.filter(r => new Date(r.created_at) >= todayStart).length;

    return { total, avg_confidence, most_detected, today_count, distribution: dist };
  } catch {
    return empty;
  }
}
