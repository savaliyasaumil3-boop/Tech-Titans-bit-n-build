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

// ─── Waste Classification ─────────────────────────────────────────────────────

export type WasteCategory =
  | "Plastic"
  | "Paper"
  | "Metal"
  | "Glass"
  | "Organic"
  | "Other"
  | "Unknown";

export interface ClassificationPrediction {
  class: WasteCategory;
  confidence: number;
  confidence_percentage: number;
}

export interface DbWasteClassification {
  id: string;
  image_url: string | null;
  predicted_class: WasteCategory;
  confidence: number;
  top_predictions: ClassificationPrediction[];
  is_confident: boolean;
  is_demo_mode: boolean;
  created_at: string;
}

export interface ClassificationStats {
  total: number;
  avg_confidence: number;
  most_detected: WasteCategory | null;
  today_count: number;
  distribution: Record<string, number>;
}

// ─── Waste Source & Forecasting Types ────────────────────────────────────────

export type SourceType =
  | "factory"
  | "industrial_area"
  | "residential"
  | "commercial"
  | "restaurant"
  | "market"
  | "construction"
  | "office"
  | "warehouse"
  | "recycling_center"
  | "other";

export type IndustryType =
  | "paper"
  | "metal"
  | "textile"
  | "food"
  | "plastic"
  | "automobile"
  | "chemical"
  | "construction"
  | "general"
  | "none";

export interface DbWasteSource {
  id: string;
  source_code: string;
  name: string;
  source_type: SourceType;
  industry_type: IndustryType;
  latitude: number;
  longitude: number;
  address: string;
  expected_waste_types: WasteCategory[];
  operating_hours_start: string;
  operating_hours_end: string;
  collection_frequency: string;
  estimated_daily_generation_kg: number;
  priority: PriorityCategory;
  status: "active" | "inactive" | "maintenance";
  is_demo_data: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbWasteGenerationRecord {
  id: string;
  source_id: string;
  waste_type: WasteCategory;
  quantity_kg: number;
  recorded_at: string;
  day_of_week: number;
  hour: number;
  collection_id?: string;
  vehicle_id?: string;
  is_demo_data: boolean;
  created_at: string;
}

export interface DbWasteForecast {
  source_id: string;
  source_code?: string;
  source_name?: string;
  source_type?: SourceType;
  industry_type?: IndustryType;
  forecast_date: string;
  forecast_hour: number;
  predicted_quantity_kg: number;
  predicted_waste_type: WasteCategory;
  waste_composition: Record<string, number>;
  confidence: number;
  confidence_percentage: number;
  lower_bound_kg: number;
  upper_bound_kg: number;
  peak_generation_hour: number;
  overflow_risk: "Low" | "Medium" | "High" | "Critical";
  priority: PriorityCategory;
  model_version: string;
  is_demo_data: boolean;
  recommended_action?: string;
}

export interface AICollectionRecommendation {
  id: string;
  source_id: string;
  source_code: string;
  source_name: string;
  source_type: SourceType;
  predicted_quantity_kg: number;
  predicted_waste_type: WasteCategory;
  overflow_risk: "Low" | "Medium" | "High" | "Critical";
  priority: PriorityCategory;
  peak_generation_hour: number;
  recommended_vehicle: string;
  recommended_vehicle_type: string;
  recommended_driver: string;
  recommended_time: string;
  reasoning: string;
  status: "pending_approval" | "approved" | "dispatched";
}

export interface ModelMetrics {
  mae: number;
  rmse: number;
  r2: number;
  trained_records: number;
  model_version: string;
  last_trained_at?: string;
}

export interface WasteHotspot {
  id: string;
  source_code: string;
  name: string;
  source_type: SourceType;
  industry_type: IndustryType;
  latitude: number;
  longitude: number;
  predicted_quantity_kg: number;
  predicted_waste_type: WasteCategory;
  overflow_risk: "Low" | "Medium" | "High" | "Critical";
  priority: PriorityCategory;
  peak_hour: number;
  address: string;
}
