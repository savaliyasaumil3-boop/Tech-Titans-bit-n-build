import type { OptimizedRoute, RouteStop } from "../db-types";

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
      signal: AbortSignal.timeout(3000), // 3s timeout
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    // ML service unavailable — caller should use fallback
    return null;
  }
}

// ─── Route Optimization ───────────────────────────────────────────────────────

interface OptimizeRouteRequest {
  vehicle_id: string;
  vehicle_capacity_kg: number;
  bins: Array<{
    id: string;
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
// Greedy nearest-neighbor heuristic when Python service is unavailable

const DEPOT = { lat: 23.0225, lng: 72.5714, name: "DEPOT" };

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  }>
): OptimizedRoute {
  // Filter bins that fit in vehicle and sort by priority descending
  // Only take bins with fill >= 50% (worth collecting)
  const candidates = bins
    .filter((b) => b.fill_percentage >= 50)
    .sort((a, b) => b.priority_score - a.priority_score);

  // Greedy nearest-neighbor starting from depot, respecting capacity
  const stops: RouteStop[] = [];
  let remainingCapacity = vehicleCapacityKg;
  let currentLat = DEPOT.lat;
  let currentLng = DEPOT.lng;
  let totalDistance = 0;
  const unvisited = [...candidates];

  while (unvisited.length > 0 && remainingCapacity > 0) {
    // Find nearest bin that we can collect
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const bin = unvisited[i];
      const collectionKg = (bin.fill_percentage / 100) * bin.capacity_kg;
      if (collectionKg > remainingCapacity) continue;

      const distKm = haversineKm(currentLat, currentLng, bin.latitude, bin.longitude);
      // Score: priority / distance (avoid 0 division)
      const score = bin.priority_score / (distKm + 0.1);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const bin = unvisited.splice(bestIdx, 1)[0];
    const collectionKg = Math.round((bin.fill_percentage / 100) * bin.capacity_kg);
    const dist = haversineKm(currentLat, currentLng, bin.latitude, bin.longitude);
    totalDistance += dist;
    remainingCapacity -= collectionKg;
    currentLat = bin.latitude;
    currentLng = bin.longitude;

    stops.push({
      id: bin.id,
      name: bin.location_name,
      latitude: bin.latitude,
      longitude: bin.longitude,
      required_collection_kg: collectionKg,
      priority: bin.priority_score,
      order: stops.length + 1,
    });

    // Stop at 10 bins to keep routes manageable
    if (stops.length >= 10) break;
  }

  // Return to depot
  if (stops.length > 0) {
    const lastStop = stops[stops.length - 1];
    totalDistance += haversineKm(lastStop.latitude, lastStop.longitude, DEPOT.lat, DEPOT.lng);
  }

  const totalCollectionKg = stops.reduce((s, st) => s + st.required_collection_kg, 0);
  const avgSpeedKmh = 30; // urban average
  const estimatedTimeMin = Math.round((totalDistance / avgSpeedKmh) * 60 + stops.length * 5);

  const routeIds = ["DEPOT", ...stops.map((s) => s.id), "DEPOT"];

  return {
    vehicle_id: vehicleId,
    vehicle_number: vehicleNumber,
    total_distance_km: Math.round(totalDistance * 10) / 10,
    estimated_time_minutes: estimatedTimeMin,
    total_collection_kg: totalCollectionKg,
    route: routeIds,
    stops,
  };
}
