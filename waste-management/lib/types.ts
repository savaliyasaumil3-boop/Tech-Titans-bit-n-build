export type WasteType =
  | "Plastic"
  | "Paper"
  | "Metal"
  | "Glass"
  | "Organic"
  | "E-Waste"
  | "Other";

export type BinStatus = "healthy" | "warning" | "critical";

export type VehicleStatus = "active" | "idle" | "maintenance";

export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type AlertType =
  | "overflow"
  | "maintenance"
  | "collection"
  | "system"
  | "route";

export interface SmartBin {
  id: string;
  locationName: string;
  lat: number;
  lng: number;
  capacity: number; // in liters
  fillLevel: number; // 0-100 percentage
  wasteType: WasteType;
  status: BinStatus;
  lastUpdated: string;
  predictedFullHours: number;
  priorityScore: number; // 0-100
  area: string;
}

export interface Vehicle {
  id: string;
  name: string;
  driver: string;
  status: VehicleStatus;
  lat: number;
  lng: number;
  route: string;
  capacity: number; // in tons
  currentLoad: number; // in tons
  fuelLevel: number; // 0-100 percentage
  lastCollection: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  message: string;
  binId?: string;
  timestamp: string;
  severity: AlertSeverity;
  resolved: boolean;
}

export interface KPIData {
  label: string;
  value: string;
  subtitle: string;
  trend: number; // percentage change
  trendLabel: string;
}

export interface WasteGenerationDataPoint {
  date: string;
  plastic: number;
  paper: number;
  metal: number;
  glass: number;
  organic: number;
  other: number;
  total: number;
}

export interface WasteCompositionDataPoint {
  name: string;
  value: number;
  color: string;
}
