import type { DbBin, DbVehicle, DbAlert, DbPrediction, DbWasteRecord } from "../db-types";
import type { WasteType } from "../types";

// ─── 50 Bins across Ahmedabad ─────────────────────────────────────────────────

export const demoBins: DbBin[] = [
  // Critical bins (fill >= 80%)
  { id: "BIN-001", location_name: "SG Highway Junction", latitude: 23.0307, longitude: 72.5074, capacity_kg: 200, current_fill_kg: 184, fill_percentage: 92, waste_type: "Plastic", status: "critical", predicted_full_hours: 2, priority_score: 95, last_updated: "2026-09-19T08:15:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-002", location_name: "CG Road Market", latitude: 23.0264, longitude: 72.5875, capacity_kg: 160, current_fill_kg: 125, fill_percentage: 78, waste_type: "Paper", status: "warning", predicted_full_hours: 6, priority_score: 72, last_updated: "2026-09-19T07:45:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-003", location_name: "Navrangpura Circle", latitude: 23.0385, longitude: 72.5623, capacity_kg: 200, current_fill_kg: 90, fill_percentage: 45, waste_type: "Organic", status: "healthy", predicted_full_hours: 18, priority_score: 30, last_updated: "2026-09-19T08:00:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-004", location_name: "Vastrapur Lake Garden", latitude: 23.0364, longitude: 72.5244, capacity_kg: 120, current_fill_kg: 106, fill_percentage: 88, waste_type: "Plastic", status: "critical", predicted_full_hours: 3, priority_score: 90, last_updated: "2026-09-19T08:10:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-005", location_name: "Paldi Cross Road", latitude: 23.0103, longitude: 72.5642, capacity_kg: 160, current_fill_kg: 99, fill_percentage: 62, waste_type: "Glass", status: "warning", predicted_full_hours: 10, priority_score: 55, last_updated: "2026-09-19T07:30:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-006", location_name: "Maninagar Station", latitude: 22.9985, longitude: 72.6012, capacity_kg: 200, current_fill_kg: 70, fill_percentage: 35, waste_type: "Metal", status: "healthy", predicted_full_hours: 24, priority_score: 20, last_updated: "2026-09-19T08:20:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-007", location_name: "Law Garden", latitude: 23.0322, longitude: 72.5612, capacity_kg: 160, current_fill_kg: 136, fill_percentage: 85, waste_type: "Organic", status: "critical", predicted_full_hours: 4, priority_score: 88, last_updated: "2026-09-19T07:55:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-008", location_name: "Satellite Road", latitude: 23.0244, longitude: 72.5305, capacity_kg: 120, current_fill_kg: 66, fill_percentage: 55, waste_type: "Paper", status: "warning", predicted_full_hours: 12, priority_score: 48, last_updated: "2026-09-19T08:05:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-009", location_name: "Ashram Road Riverfront", latitude: 23.0285, longitude: 72.5743, capacity_kg: 200, current_fill_kg: 84, fill_percentage: 42, waste_type: "Plastic", status: "healthy", predicted_full_hours: 20, priority_score: 25, last_updated: "2026-09-19T08:25:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-010", location_name: "Prahlad Nagar Garden", latitude: 23.0132, longitude: 72.5233, capacity_kg: 160, current_fill_kg: 146, fill_percentage: 91, waste_type: "Plastic", status: "critical", predicted_full_hours: 2, priority_score: 93, last_updated: "2026-09-19T07:40:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-011", location_name: "Ambawadi Circle", latitude: 23.0337, longitude: 72.5504, capacity_kg: 200, current_fill_kg: 190, fill_percentage: 95, waste_type: "Organic", status: "critical", predicted_full_hours: 1, priority_score: 98, last_updated: "2026-09-19T08:42:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-012", location_name: "Bodakdev Crossroads", latitude: 23.0412, longitude: 72.5142, capacity_kg: 160, current_fill_kg: 48, fill_percentage: 30, waste_type: "Paper", status: "healthy", predicted_full_hours: 36, priority_score: 15, last_updated: "2026-09-19T08:30:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-013", location_name: "Thaltej Village Road", latitude: 23.0524, longitude: 72.5013, capacity_kg: 120, current_fill_kg: 72, fill_percentage: 60, waste_type: "Glass", status: "warning", predicted_full_hours: 11, priority_score: 52, last_updated: "2026-09-19T07:50:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-014", location_name: "Gurukul Road Market", latitude: 23.0485, longitude: 72.5334, capacity_kg: 200, current_fill_kg: 172, fill_percentage: 86, waste_type: "Metal", status: "critical", predicted_full_hours: 3, priority_score: 87, last_updated: "2026-09-19T08:08:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-015", location_name: "Nehru Nagar Junction", latitude: 23.0194, longitude: 72.5453, capacity_kg: 160, current_fill_kg: 54, fill_percentage: 34, waste_type: "Organic", status: "healthy", predicted_full_hours: 30, priority_score: 18, last_updated: "2026-09-19T08:35:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-016", location_name: "Iscon Temple Cross", latitude: 23.0276, longitude: 72.5074, capacity_kg: 200, current_fill_kg: 130, fill_percentage: 65, waste_type: "Plastic", status: "warning", predicted_full_hours: 8, priority_score: 60, last_updated: "2026-09-19T07:20:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-017", location_name: "Drive In Road", latitude: 23.0441, longitude: 72.5284, capacity_kg: 120, current_fill_kg: 98, fill_percentage: 82, waste_type: "Paper", status: "critical", predicted_full_hours: 5, priority_score: 84, last_updated: "2026-09-19T08:18:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-018", location_name: "Sindhu Bhavan Road", latitude: 23.0352, longitude: 72.5032, capacity_kg: 160, current_fill_kg: 38, fill_percentage: 24, waste_type: "Glass", status: "healthy", predicted_full_hours: 48, priority_score: 10, last_updated: "2026-09-19T08:40:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-019", location_name: "Shahibaug Road", latitude: 23.0575, longitude: 72.5843, capacity_kg: 200, current_fill_kg: 144, fill_percentage: 72, waste_type: "Organic", status: "warning", predicted_full_hours: 7, priority_score: 68, last_updated: "2026-09-19T07:35:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-020", location_name: "Sabarmati Ashram Gate", latitude: 23.0601, longitude: 72.5793, capacity_kg: 120, current_fill_kg: 42, fill_percentage: 35, waste_type: "Plastic", status: "healthy", predicted_full_hours: 28, priority_score: 19, last_updated: "2026-09-19T08:22:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-021", location_name: "Shahibaug Palace Road", latitude: 23.0553, longitude: 72.5923, capacity_kg: 160, current_fill_kg: 142, fill_percentage: 89, waste_type: "Metal", status: "critical", predicted_full_hours: 3, priority_score: 91, last_updated: "2026-09-19T07:15:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-022", location_name: "Relief Road Junction", latitude: 23.0261, longitude: 72.5973, capacity_kg: 200, current_fill_kg: 100, fill_percentage: 50, waste_type: "Paper", status: "warning", predicted_full_hours: 14, priority_score: 44, last_updated: "2026-09-19T08:12:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-023", location_name: "Judges Bungalow Road", latitude: 23.0425, longitude: 72.5153, capacity_kg: 120, current_fill_kg: 97, fill_percentage: 81, waste_type: "Glass", status: "critical", predicted_full_hours: 5, priority_score: 83, last_updated: "2026-09-19T06:20:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-024", location_name: "Helmet Circle", latitude: 23.0475, longitude: 72.5454, capacity_kg: 200, current_fill_kg: 56, fill_percentage: 28, waste_type: "Organic", status: "healthy", predicted_full_hours: 40, priority_score: 12, last_updated: "2026-09-19T08:45:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-025", location_name: "Mansi Circle", latitude: 23.0312, longitude: 72.5193, capacity_kg: 160, current_fill_kg: 124, fill_percentage: 78, waste_type: "Plastic", status: "warning", predicted_full_hours: 6, priority_score: 71, last_updated: "2026-09-19T07:58:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-026", location_name: "Vijay Cross Roads", latitude: 23.0234, longitude: 72.5713, capacity_kg: 120, current_fill_kg: 108, fill_percentage: 90, waste_type: "Metal", status: "critical", predicted_full_hours: 2, priority_score: 92, last_updated: "2026-09-19T08:02:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-027", location_name: "Khanpur Road", latitude: 23.0171, longitude: 72.5984, capacity_kg: 200, current_fill_kg: 76, fill_percentage: 38, waste_type: "Paper", status: "healthy", predicted_full_hours: 26, priority_score: 23, last_updated: "2026-09-19T08:38:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-028", location_name: "Ellis Bridge West", latitude: 23.0211, longitude: 72.5743, capacity_kg: 160, current_fill_kg: 118, fill_percentage: 74, waste_type: "Organic", status: "warning", predicted_full_hours: 7, priority_score: 67, last_updated: "2026-09-19T07:42:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-029", location_name: "Panjrapole Road", latitude: 23.0292, longitude: 72.5663, capacity_kg: 120, current_fill_kg: 36, fill_percentage: 30, waste_type: "Glass", status: "healthy", predicted_full_hours: 38, priority_score: 16, last_updated: "2026-09-19T08:48:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-030", location_name: "New Cloth Market", latitude: 23.0225, longitude: 72.6083, capacity_kg: 200, current_fill_kg: 170, fill_percentage: 85, waste_type: "Plastic", status: "critical", predicted_full_hours: 4, priority_score: 86, last_updated: "2026-09-19T08:10:00Z", created_at: "2026-01-01T00:00:00Z" },
  // More bins for area coverage
  { id: "BIN-031", location_name: "Gota Junction", latitude: 23.0754, longitude: 72.5214, capacity_kg: 160, current_fill_kg: 58, fill_percentage: 36, waste_type: "Metal", status: "healthy", predicted_full_hours: 32, priority_score: 22, last_updated: "2026-09-19T08:30:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-032", location_name: "Chandkheda Crossroads", latitude: 23.0863, longitude: 72.5843, capacity_kg: 120, current_fill_kg: 50, fill_percentage: 42, waste_type: "Paper", status: "healthy", predicted_full_hours: 24, priority_score: 27, last_updated: "2026-09-19T08:25:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-033", location_name: "Motera Stadium Area", latitude: 23.0914, longitude: 72.5984, capacity_kg: 200, current_fill_kg: 142, fill_percentage: 71, waste_type: "Plastic", status: "warning", predicted_full_hours: 8, priority_score: 65, last_updated: "2026-09-19T07:50:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-034", location_name: "Naroda Industrial", latitude: 23.0854, longitude: 72.6543, capacity_kg: 160, current_fill_kg: 140, fill_percentage: 88, waste_type: "Metal", status: "critical", predicted_full_hours: 3, priority_score: 89, last_updated: "2026-09-19T07:38:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-035", location_name: "Bapunagar Junction", latitude: 23.0453, longitude: 72.6313, capacity_kg: 120, current_fill_kg: 54, fill_percentage: 45, waste_type: "Organic", status: "healthy", predicted_full_hours: 20, priority_score: 31, last_updated: "2026-09-19T08:18:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-036", location_name: "Odhav GIDC", latitude: 23.0234, longitude: 72.6783, capacity_kg: 200, current_fill_kg: 160, fill_percentage: 80, waste_type: "Metal", status: "critical", predicted_full_hours: 5, priority_score: 82, last_updated: "2026-09-19T07:25:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-037", location_name: "Nikol Junction", latitude: 23.0344, longitude: 72.6553, capacity_kg: 120, current_fill_kg: 42, fill_percentage: 35, waste_type: "Glass", status: "healthy", predicted_full_hours: 30, priority_score: 21, last_updated: "2026-09-19T08:42:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-038", location_name: "Vastral Bridge", latitude: 23.0124, longitude: 72.6673, capacity_kg: 160, current_fill_kg: 110, fill_percentage: 69, waste_type: "Organic", status: "warning", predicted_full_hours: 9, priority_score: 62, last_updated: "2026-09-19T07:55:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-039", location_name: "Rakhial Road", latitude: 23.0464, longitude: 72.6143, capacity_kg: 200, current_fill_kg: 74, fill_percentage: 37, waste_type: "Paper", status: "healthy", predicted_full_hours: 28, priority_score: 24, last_updated: "2026-09-19T08:35:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-040", location_name: "Sarkhej Roza", latitude: 22.9764, longitude: 72.4983, capacity_kg: 120, current_fill_kg: 96, fill_percentage: 80, waste_type: "Plastic", status: "critical", predicted_full_hours: 6, priority_score: 81, last_updated: "2026-09-19T07:32:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-041", location_name: "Vatva GIDC Gate", latitude: 22.9644, longitude: 72.6213, capacity_kg: 200, current_fill_kg: 60, fill_percentage: 30, waste_type: "Metal", status: "healthy", predicted_full_hours: 42, priority_score: 14, last_updated: "2026-09-19T08:50:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-042", location_name: "Narol Circle", latitude: 22.9624, longitude: 72.6423, capacity_kg: 160, current_fill_kg: 128, fill_percentage: 80, waste_type: "Organic", status: "critical", predicted_full_hours: 5, priority_score: 80, last_updated: "2026-09-19T07:48:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-043", location_name: "Juhapura Circle", latitude: 23.0004, longitude: 72.5333, capacity_kg: 120, current_fill_kg: 82, fill_percentage: 68, waste_type: "Paper", status: "warning", predicted_full_hours: 9, priority_score: 63, last_updated: "2026-09-19T07:40:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-044", location_name: "Bopal Junction", latitude: 23.0044, longitude: 72.4683, capacity_kg: 200, current_fill_kg: 56, fill_percentage: 28, waste_type: "Glass", status: "healthy", predicted_full_hours: 44, priority_score: 13, last_updated: "2026-09-19T08:55:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-045", location_name: "South Bopal", latitude: 22.9944, longitude: 72.4723, capacity_kg: 160, current_fill_kg: 112, fill_percentage: 70, waste_type: "Plastic", status: "warning", predicted_full_hours: 8, priority_score: 64, last_updated: "2026-09-19T07:28:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-046", location_name: "Ghatlodia Crossroads", latitude: 23.0614, longitude: 72.5433, capacity_kg: 120, current_fill_kg: 44, fill_percentage: 37, waste_type: "Organic", status: "healthy", predicted_full_hours: 26, priority_score: 26, last_updated: "2026-09-19T08:28:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-047", location_name: "Ranip Junction", latitude: 23.0664, longitude: 72.5653, capacity_kg: 200, current_fill_kg: 148, fill_percentage: 74, waste_type: "Metal", status: "warning", predicted_full_hours: 7, priority_score: 69, last_updated: "2026-09-19T07:45:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-048", location_name: "Sola Civil Hospital", latitude: 23.0544, longitude: 72.5183, capacity_kg: 160, current_fill_kg: 64, fill_percentage: 40, waste_type: "Paper", status: "healthy", predicted_full_hours: 22, priority_score: 29, last_updated: "2026-09-19T08:32:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-049", location_name: "Memnagar Fire Station", latitude: 23.0494, longitude: 72.5383, capacity_kg: 200, current_fill_kg: 182, fill_percentage: 91, waste_type: "Organic", status: "critical", predicted_full_hours: 2, priority_score: 94, last_updated: "2026-09-19T08:14:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-050", location_name: "Anna Nagar Circle", latitude: 23.0384, longitude: 72.5903, capacity_kg: 120, current_fill_kg: 66, fill_percentage: 55, waste_type: "Glass", status: "warning", predicted_full_hours: 13, priority_score: 47, last_updated: "2026-09-19T07:55:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-051", location_name: "Polytechnic Cross", latitude: 23.0624, longitude: 72.5733, capacity_kg: 160, current_fill_kg: 126, fill_percentage: 79, waste_type: "Plastic", status: "warning", predicted_full_hours: 6, priority_score: 73, last_updated: "2026-09-19T07:22:00Z", created_at: "2026-01-01T00:00:00Z" },
  { id: "BIN-052", location_name: "Gujarat University Gate", latitude: 23.0344, longitude: 72.5493, capacity_kg: 200, current_fill_kg: 92, fill_percentage: 46, waste_type: "Paper", status: "healthy", predicted_full_hours: 19, priority_score: 33, last_updated: "2026-09-19T08:44:00Z", created_at: "2026-01-01T00:00:00Z" },
];

// ─── 6 Vehicles ───────────────────────────────────────────────────────────────

export const demoVehicles: DbVehicle[] = [
  { id: "V-001", vehicle_number: "GJ-01-WM-0001", vehicle_type: "Compactor", capacity_kg: 1000, current_load_kg: 320, latitude: 23.028, longitude: 72.555, status: "collecting", driver_name: "Rajesh Patel", last_updated: "2026-09-19T08:30:00Z" },
  { id: "V-002", vehicle_number: "GJ-01-WM-0002", vehicle_type: "Tipper", capacity_kg: 800, current_load_kg: 180, latitude: 23.045, longitude: 72.521, status: "available", driver_name: "Amit Shah", last_updated: "2026-09-19T08:00:00Z" },
  { id: "V-003", vehicle_number: "GJ-01-WM-0003", vehicle_type: "Compactor", capacity_kg: 1000, current_load_kg: 0, latitude: 23.015, longitude: 72.567, status: "returning", driver_name: "Priya Desai", last_updated: "2026-09-19T07:45:00Z" },
  { id: "V-004", vehicle_number: "GJ-01-WM-0004", vehicle_type: "Tipper", capacity_kg: 600, current_load_kg: 520, latitude: 23.055, longitude: 72.585, status: "collecting", driver_name: "Vikram Mehta", last_updated: "2026-09-19T08:15:00Z" },
  { id: "V-005", vehicle_number: "GJ-01-WM-0005", vehicle_type: "Mini Truck", capacity_kg: 400, current_load_kg: 0, latitude: 23.022, longitude: 72.541, status: "maintenance", driver_name: "Neha Joshi", last_updated: "2026-09-18T16:30:00Z" },
  { id: "V-006", vehicle_number: "GJ-01-WM-0006", vehicle_type: "Compactor", capacity_kg: 1000, current_load_kg: 650, latitude: 23.038, longitude: 72.598, status: "returning", driver_name: "Suresh Kumar", last_updated: "2026-09-19T08:20:00Z" },
];

// ─── Predictions ──────────────────────────────────────────────────────────────

export const demoPredictions: DbPrediction[] = demoBins.map((bin) => ({
  id: `PRED-${bin.id}`,
  bin_id: bin.id,
  predicted_full_hours: bin.predicted_full_hours,
  predicted_fill_percentage: Math.min(100, bin.fill_percentage + Math.round(bin.fill_percentage * 0.1)),
  overflow_probability: bin.fill_percentage >= 90 ? 0.88 + Math.random() * 0.1
    : bin.fill_percentage >= 75 ? 0.45 + Math.random() * 0.3
    : bin.fill_percentage >= 50 ? 0.1 + Math.random() * 0.2
    : Math.random() * 0.1,
  prediction_created_at: new Date().toISOString(),
}));

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const demoAlerts: DbAlert[] = [
  { id: "ALT-001", bin_id: "BIN-011", vehicle_id: null, type: "overflow", severity: "critical", message: "BIN-011 at Ambawadi Circle is at 95% capacity — overflow imminent", is_read: false, created_at: "2026-09-19T08:42:00Z" },
  { id: "ALT-002", bin_id: "BIN-001", vehicle_id: null, type: "overflow", severity: "critical", message: "BIN-001 at SG Highway Junction has reached 92% — schedule collection", is_read: false, created_at: "2026-09-19T08:30:00Z" },
  { id: "ALT-003", bin_id: "BIN-049", vehicle_id: null, type: "overflow", severity: "critical", message: "BIN-049 at Memnagar Fire Station reached 91% capacity", is_read: false, created_at: "2026-09-19T08:14:00Z" },
  { id: "ALT-004", bin_id: "BIN-026", vehicle_id: null, type: "overflow", severity: "critical", message: "BIN-026 at Vijay Cross Roads at 90% — immediate collection needed", is_read: false, created_at: "2026-09-19T08:02:00Z" },
  { id: "ALT-005", bin_id: "BIN-030", vehicle_id: null, type: "high_generation", severity: "warning", message: "BIN-030 at New Cloth Market: waste generation 34% above average", is_read: false, created_at: "2026-09-19T07:58:00Z" },
  { id: "ALT-006", bin_id: "BIN-021", vehicle_id: null, type: "overflow", severity: "warning", message: "BIN-021 at Shahibaug Palace Road predicted to overflow in 3 hours", is_read: false, created_at: "2026-09-19T07:15:00Z" },
  { id: "ALT-007", bin_id: null, vehicle_id: "V-004", type: "vehicle", severity: "warning", message: "V-004 (GJ-01-WM-0004) load at 87% capacity — return to depot soon", is_read: false, created_at: "2026-09-19T08:15:00Z" },
  { id: "ALT-008", bin_id: null, vehicle_id: "V-003", type: "vehicle", severity: "info", message: "V-003 completed collection route — returning to depot", is_read: false, created_at: "2026-09-19T07:45:00Z" },
  { id: "ALT-009", bin_id: "BIN-019", vehicle_id: null, type: "high_generation", severity: "warning", message: "Shahibaug area generating 28% more waste than historical average", is_read: false, created_at: "2026-09-19T07:35:00Z" },
  { id: "ALT-010", bin_id: null, vehicle_id: null, type: "system", severity: "info", message: "AI prediction model updated — accuracy at 93.7%", is_read: true, created_at: "2026-09-19T06:30:00Z" },
  { id: "ALT-011", bin_id: "BIN-007", vehicle_id: null, type: "overflow", severity: "warning", message: "BIN-007 at Law Garden at 85% — schedule collection within 4 hours", is_read: true, created_at: "2026-09-19T07:55:00Z" },
  { id: "ALT-012", bin_id: "BIN-034", vehicle_id: null, type: "overflow", severity: "warning", message: "BIN-034 at Naroda Industrial reaching critical levels (88%)", is_read: false, created_at: "2026-09-19T07:38:00Z" },
];

// ─── Historical waste records (generate several weeks of data) ────────────────

function generateWasteRecords(): DbWasteRecord[] {
  const records: DbWasteRecord[] = [];

  // 30 days of data, ~5-10 records per bin per day (sampling)
  const now = new Date();
  let recordId = 1;

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const dayDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);

    // Sample 20 bins per day (not all 52 to keep data manageable)
    const binsForDay = demoBins.slice(0, 30);

    for (const bin of binsForDay) {
      // 2-4 records per bin per day
      const recordCount = 2 + (recordId % 3);
      for (let r = 0; r < recordCount; r++) {
        const hourOfDay = 6 + (r * 4); // spaced through the day
        const recordDate = new Date(dayDate);
        recordDate.setHours(hourOfDay);

        // Base weight on bin capacity (1-2% per record)
        const baseWeight = bin.capacity_kg * (0.01 + (recordId % 5) * 0.002);
        const dayOfWeekFactor = dayDate.getDay() === 0 || dayDate.getDay() === 6 ? 1.3 : 1.0;
        const weight = Math.round(baseWeight * dayOfWeekFactor * 10) / 10;

        records.push({
          id: `WR-${String(recordId).padStart(5, "0")}`,
          bin_id: bin.id,
          waste_type: bin.waste_type,
          weight_kg: weight,
          recorded_at: recordDate.toISOString(),
        });
        recordId++;
      }
    }
  }
  return records;
}

export const demoWasteRecords = generateWasteRecords();
