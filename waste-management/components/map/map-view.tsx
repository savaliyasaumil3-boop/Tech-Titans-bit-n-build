"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { BinMarker } from "./bin-marker";
import { MapLegend } from "./map-legend";
import { VehicleMarker, RoutePolyline, OrderMarker } from "./vehicle-marker";
import type { SmartBin } from "@/lib/types";
import type { DbBin, DbVehicle, OptimizedRoute } from "@/lib/db-types";

interface MapViewProps {
  bins?: SmartBin[];
  dbBins?: DbBin[];
  vehicles?: DbVehicle[];
  activeRoute?: OptimizedRoute | null;
  focusedBinId?: string | null;
  isSimulating?: boolean;
  simulatingVehicleId?: string;
}

function FitBounds({ bins, dbBins }: { bins?: SmartBin[]; dbBins?: DbBin[] }) {
  const map = useMap();

  const positions: [number, number][] = [
    ...(bins?.map((b) => [b.lat, b.lng] as [number, number]) ?? []),
    ...(dbBins?.map((b) => [b.latitude, b.longitude] as [number, number]) ?? []),
  ];

  if (positions.length > 0) {
    map.fitBounds(positions, { padding: [30, 30], maxZoom: 14 });
  }

  return null;
}

function FocusBin({ binId, dbBins }: { binId: string | null | undefined; dbBins?: DbBin[] }) {
  const map = useMap();
  if (!binId || !dbBins) return null;
  const bin = dbBins.find((b) => b.id === binId);
  if (bin) {
    map.setView([bin.latitude, bin.longitude], 16, { animate: true });
  }
  return null;
}

// Convert DbBin to SmartBin shape for BinMarker compatibility
function dbBinToSmartBin(bin: DbBin): SmartBin {
  return {
    id: bin.id,
    locationName: bin.location_name,
    lat: bin.latitude,
    lng: bin.longitude,
    capacity: bin.capacity_kg,
    fillLevel: bin.fill_percentage,
    wasteType: bin.waste_type,
    status: bin.status,
    lastUpdated: bin.last_updated,
    predictedFullHours: bin.predicted_full_hours,
    priorityScore: bin.priority_score,
    area: bin.location_name.split(" ")[0],
  };
}

const DEPOT = { latitude: 23.0225, longitude: 72.5714, id: "DEPOT" };

export function MapView({ bins, dbBins, vehicles, activeRoute, focusedBinId, isSimulating, simulatingVehicleId }: MapViewProps) {
  // Merge legacy bins and dbBins
  const allSmartBins: SmartBin[] = [
    ...(bins ?? []),
    ...(dbBins ?? []).map(dbBinToSmartBin),
  ];

  // Build route waypoints for polyline
  const routeWaypoints = activeRoute
    ? [
        DEPOT,
        ...activeRoute.stops.map((s) => ({
          latitude: s.latitude,
          longitude: s.longitude,
          id: s.id,
        })),
        DEPOT,
      ]
    : [];

  return (
    <div className="relative h-full w-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[23.0225, 72.5714]}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        style={{ minHeight: 400 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds bins={bins} dbBins={dbBins} />
        <FocusBin binId={focusedBinId} dbBins={dbBins} />

        {/* Bin markers */}
        {allSmartBins.map((bin) => (
          <BinMarker key={bin.id} bin={bin} />
        ))}

        {/* Vehicle markers */}
        {vehicles?.map((v) => {
          // Hide static marker if we are simulating this vehicle's route
          if (isSimulating && v.id === simulatingVehicleId) return null;
          return <VehicleMarker key={v.id} vehicle={v} />;
        })}

        {/* Route polyline */}
        {activeRoute && routeWaypoints.length > 1 && (
          <RoutePolyline 
            waypoints={routeWaypoints}
            isSimulating={isSimulating}
            activeVehicle={vehicles?.find(v => v.id === simulatingVehicleId)}
          />
        )}

        {/* Route order markers */}
        {activeRoute?.stops.map((stop) => (
          <OrderMarker
            key={stop.id}
            position={[stop.latitude, stop.longitude]}
            order={stop.order}
          />
        ))}

        <MapLegend bins={allSmartBins} />
      </MapContainer>
    </div>
  );
}
