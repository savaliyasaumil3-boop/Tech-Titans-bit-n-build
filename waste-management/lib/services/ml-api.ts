import type { OptimizedRoute, RouteStop } from "../db-types";
import { buildVehicleRoutePlan } from "./route-optimizer";

const ML_API_URL = process.env.NEXT_PUBLIC_ML_API_URL ?? "http://localhost:8000";

// ─── ML Prediction ────────────────────────────────────────────────────────────

interface PredictFillRequest {
  bin_id: string;
  current_fill_percentage: number;
  capacity_kg: number;
}

interface PredictFillResponse {
  bin_id: string;
  predicted_full_hours: number;
  overflow_probability: number;
}

export async function predictFill(
  req: PredictFillRequest
): Promise<PredictFillResponse | null> {
  try {
    const res = await fetch(`${ML_API_URL}/predict-fill`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(10000), // 10s timeout to allow cold starts
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    // ML service unavailable — caller should use fallback
    return null;
  }
}

// ─── Waste Vision Classification ────────────────────────────────────────────────

export interface WasteClassificationResult {
  category: "Plastic" | "Organic" | "Metal" | "Paper" | "Glass" | "E-Waste" | "Other" | "Unavailable" | "Unknown";
  confidence: number;
  filename: string;
  image_dimensions: string;
  recyclability: string;
  recommendedBin: string;
  carbonOffset: string;
  decompositionTime: string;
  tips: string;
  is_valid?: boolean;
  error_detail?: string;
  error?: string;
  all_scores?: Record<string, number>;
}


export async function classifyWaste(file: File): Promise<WasteClassificationResult | null> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${ML_API_URL}/api/ml/classify-waste`, {
      method: "POST",
      body: formData,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("classifyWaste error:", err);
    return null;
  }
}


// ─── Route Optimization ───────────────────────────────────────────────────────

interface OptimizeRouteRequest {
  vehicle_id: string;
  vehicle_capacity_kg: number;
  bins: Array<{
    id: string;
    location_name: string;
    latitude: number;
    longitude: number;
    required_collection_kg: number;
    priority: number;
  }>;
}

export async function optimizeRoute(
  req: OptimizeRouteRequest
): Promise<OptimizedRoute | null> {
  try {
    const res = await fetch(`${ML_API_URL}/optimize-route`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      signal: AbortSignal.timeout(10000), // 10s timeout for optimizer
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    // OR-Tools service unavailable — caller will use JS fallback
    return null;
  }
}

// ─── Client-side fallback route optimizer ────────────────────────────────────
// Greedy nearest-neighbor heuristic when Python service is unavailable.
// The planner is vehicle-aware and prevents reassigning bins already reserved
// by another truck.

export function fallbackOptimizeRoute(
  vehicleId: string,
  vehicleNumber: string,
  vehicleCapacityKg: number,
  bins: Array<{
    id: string;
    location_name: string;
    latitude: number;
    longitude: number;
    fill_percentage: number;
    capacity_kg: number;
    priority_score: number;
  }>,
  vehicleLocation?: { latitude: number; longitude: number },
  requests: Array<{ bin_id: string; assigned_vehicle_id: string | null }> = []
): OptimizedRoute {
  const vehicle = {
    id: vehicleId,
    vehicle_number: vehicleNumber,
    capacity_kg: vehicleCapacityKg,
    current_load_kg: 0,
    latitude: vehicleLocation?.latitude ?? 23.0225,
    longitude: vehicleLocation?.longitude ?? 72.5714,
    status: "available",
  };

  const route = buildVehicleRoutePlan({
    vehicle,
    bins,
    requests,
  });

  return {
    vehicle_id: route.vehicle_id,
    vehicle_number: route.vehicle_number,
    total_distance_km: route.total_distance_km,
    estimated_time_minutes: route.estimated_time_minutes,
    total_collection_kg: route.total_collection_kg,
    route: route.route,
    stops: route.stops as RouteStop[],
  };
}
