import test from "node:test";
import assert from "node:assert/strict";

import { buildVehicleRoutePlan } from "./route-optimizer.ts";

test("prioritizes the nearest eligible bin within truck capacity and excludes bins already assigned elsewhere", () => {
  const vehicle = {
    id: "V-002",
    vehicle_number: "V-002",
    capacity_kg: 1200,
    current_load_kg: 150,
    latitude: 23.0218,
    longitude: 72.5708,
    status: "available"
  };

  const bins = [
    { id: "BIN-A", location_name: "Far bin", latitude: 23.0380, longitude: 72.5850, fill_percentage: 90, capacity_kg: 500, priority_score: 95 },
    { id: "BIN-B", location_name: "Near bin", latitude: 23.0220, longitude: 72.5715, fill_percentage: 85, capacity_kg: 300, priority_score: 80 },
    { id: "BIN-C", location_name: "Already assigned", latitude: 23.02, longitude: 72.57, fill_percentage: 88, capacity_kg: 300, priority_score: 90 },
    { id: "BIN-D", location_name: "Too big", latitude: 23.0230, longitude: 72.5720, fill_percentage: 80, capacity_kg: 1100, priority_score: 65 },
  ];

  const requests = [
    { id: "REQ-OTHER", bin_id: "BIN-C", assigned_vehicle_id: "V-999", status: "assigned", required_quantity_kg: 250 },
  ];

  const route = buildVehicleRoutePlan({ vehicle, bins, requests });

  assert.ok(route.stops.length >= 2);
  assert.equal(route.stops[0].id, "BIN-B");
  assert.ok(!route.stops.some(stop => stop.id === "BIN-C"));
  assert.ok(route.total_collection_kg <= vehicle.capacity_kg - vehicle.current_load_kg);
  assert.ok(route.total_distance_km > 0);
});

test("returns no stops when every eligible bin is already assigned or exceeds remaining truck capacity", () => {
  const vehicle = {
    id: "V-003",
    vehicle_number: "V-003",
    capacity_kg: 800,
    current_load_kg: 700,
    latitude: 23.024,
    longitude: 72.57,
    status: "available"
  };

  const bins = [
    { id: "BIN-E", location_name: "Assigned elsewhere", latitude: 23.025, longitude: 72.5705, fill_percentage: 80, capacity_kg: 500, priority_score: 80 },
    { id: "BIN-F", location_name: "Over capacity", latitude: 23.028, longitude: 72.575, fill_percentage: 95, capacity_kg: 1500, priority_score: 90 },
  ];

  const requests = [
    { id: "REQ-5", bin_id: "BIN-E", assigned_vehicle_id: "V-999", status: "assigned", required_quantity_kg: 350 },
    { id: "REQ-6", bin_id: "BIN-F", assigned_vehicle_id: null, status: "unassigned", required_quantity_kg: 1200 },
  ];

  const route = buildVehicleRoutePlan({ vehicle, bins, requests });
  assert.equal(route.stops.length, 0);
  assert.equal(route.total_collection_kg, 0);
});
