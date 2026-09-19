export type RoutePlannerVehicle = {
  id: string;
  vehicle_number?: string;
  capacity_kg: number;
  current_load_kg?: number;
  latitude: number;
  longitude: number;
  status?: string;
};

export type RoutePlannerBin = {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  fill_percentage: number;
  capacity_kg: number;
  priority_score?: number;
};

export type RoutePlannerRequest = {
  bin_id: string;
  assigned_vehicle_id?: string | null;
  status?: string;
  required_quantity_kg?: number;
};

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildVehicleRoutePlan({
  vehicle,
  bins,
  requests = [],
  minFillThreshold = 50,
}: {
  vehicle: RoutePlannerVehicle;
  bins: RoutePlannerBin[];
  requests?: RoutePlannerRequest[];
  minFillThreshold?: number;
}) {
  const capacityAvailableKg = Math.max(0, Number(vehicle.capacity_kg ?? 0) - Number(vehicle.current_load_kg ?? 0));

  if (!vehicle || capacityAvailableKg <= 0) {
    return {
      vehicle_id: vehicle?.id ?? "",
      vehicle_number: vehicle?.vehicle_number ?? "",
      total_distance_km: 0,
      estimated_time_minutes: 0,
      total_collection_kg: 0,
      route: [],
      stops: [],
    };
  }

  const alreadyAssignedToOtherVehicle = new Set(
    requests
      .filter((request) => request?.assigned_vehicle_id && request.assigned_vehicle_id !== vehicle.id)
      .map((request) => request.bin_id)
  );

  const eligible = bins
    .filter((bin) => {
      if (!bin || typeof bin.latitude !== "number" || typeof bin.longitude !== "number") return false;
      if (alreadyAssignedToOtherVehicle.has(bin.id)) return false;

      const fill = Number(bin.fill_percentage ?? 0);
      const capacity = Number(bin.capacity_kg ?? 0);
      const required = Math.round((fill / 100) * capacity);

      if (fill < minFillThreshold) return false;
      if (required <= 0 || required > capacityAvailableKg) return false;
      return true;
    })
    .map((bin) => {
      const fill = Number(bin.fill_percentage ?? 0);
      const capacity = Number(bin.capacity_kg ?? 0);
      const required = Math.min(Math.round((fill / 100) * capacity), capacityAvailableKg);
      const distanceKm = haversineKm(vehicle.latitude, vehicle.longitude, bin.latitude, bin.longitude);

      return {
        ...bin,
        required_collection_kg: required,
        distanceKm,
        routeScore: (100 - distanceKm * 10) + fill * 0.7 + Number(bin.priority_score ?? 0) * 0.5,
      };
    })
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      if (b.fill_percentage !== a.fill_percentage) return b.fill_percentage - a.fill_percentage;
      return Number(b.priority_score ?? 0) - Number(a.priority_score ?? 0);
    });

  const stops: Array<{
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    required_collection_kg: number;
    priority: number;
    order: number;
  }> = [];

  let currentLat = Number(vehicle.latitude ?? 0);
  let currentLng = Number(vehicle.longitude ?? 0);
  let remainingCapacity = capacityAvailableKg;
  let totalDistanceKm = 0;

  for (const bin of eligible) {
    if (remainingCapacity <= 0) break;
    const required = Math.min(bin.required_collection_kg, remainingCapacity);
    if (required <= 0) continue;
    const distanceToBin = haversineKm(currentLat, currentLng, bin.latitude, bin.longitude);
    totalDistanceKm += distanceToBin;
    currentLat = bin.latitude;
    currentLng = bin.longitude;
    remainingCapacity -= required;

    stops.push({
      id: bin.id,
      name: bin.location_name,
      latitude: bin.latitude,
      longitude: bin.longitude,
      required_collection_kg: required,
      priority: Number(bin.priority_score ?? 0),
      order: stops.length + 1,
    });

    if (stops.length >= 10) break;
  }

  const totalCollectionKg = stops.reduce((sum, stop) => sum + stop.required_collection_kg, 0);
  if (stops.length > 0) {
    totalDistanceKm += haversineKm(currentLat, currentLng, Number(vehicle.latitude ?? 0), Number(vehicle.longitude ?? 0));
  }

  return {
    vehicle_id: vehicle.id,
    vehicle_number: vehicle.vehicle_number ?? "",
    total_distance_km: Number(totalDistanceKm.toFixed(1)),
    estimated_time_minutes: Math.max(15, Math.round((totalDistanceKm / 22) * 60 + stops.length * 8)),
    total_collection_kg: totalCollectionKg,
    route: ["DEPOT", ...stops.map((stop) => stop.id), "DEPOT"],
    stops,
  };
}
