import type { WasteType, BinStatus } from "./types";

// ─── Extended Types for Part 2 ───────────────────────────────────────────────

export type PriorityCategory = "critical" | "high" | "medium" | "low";

export interface DbBin {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  capacity_kg: number;
  current_fill_kg: number;
  fill_percentage: number;
  waste_type: WasteType;
  status: BinStatus;
  predicted_full_hours: number;
  priority_score: number;
  last_updated: string;
  created_at: string;
}

export interface DbVehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity_kg: number;
  current_load_kg: number;
  latitude: number;
  longitude: number;
  status: "available" | "collecting" | "returning" | "maintenance" | "offline";
  driver_name: string;
  last_updated: string;
}

export interface DbAlert {
  id: string;
  bin_id: string | null;
  vehicle_id: string | null;
  type: "overflow" | "high_generation" | "vehicle" | "system";
  severity: "info" | "warning" | "critical";
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface DbPrediction {
  id: string;
  bin_id: string;
  predicted_full_hours: number;
  predicted_fill_percentage: number;
  overflow_probability: number;
  prediction_created_at: string;
}

export interface DbWasteRecord {
  id: string;
  bin_id: string;
  waste_type: WasteType;
  weight_kg: number;
  recorded_at: string;
}

export interface DbCollection {
  id: string;
  bin_id: string;
  vehicle_id: string;
  collected_weight_kg: number;
  collected_at: string;
  status: "completed" | "pending" | "failed";
}

export interface PriorityBin {
  bin_id: string;
  location_name: string;
  priority_score: number;
  fill_percentage: number;
  predicted_full_hours: number;
  overflow_probability: number;
  status: BinStatus;
  waste_type: WasteType;
  category: PriorityCategory;
  latitude: number;
  longitude: number;
}

export interface RouteStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  required_collection_kg: number;
  priority: number;
  order: number;
}

export interface OptimizedRoute {
  vehicle_id: string;
  vehicle_number: string;
  total_distance_km: number;
  estimated_time_minutes: number;
  total_collection_kg: number;
  route: string[];
  stops: RouteStop[];
}

export interface RecommendedAction {
  action: string;
  urgency: "immediate" | "soon" | "monitor" | "none";
  color: string;
}
