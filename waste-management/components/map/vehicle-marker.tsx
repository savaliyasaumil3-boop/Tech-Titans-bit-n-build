"use client";

import { Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import type { DbVehicle } from "@/lib/db-types";

// ─── Vehicle Icon ─────────────────────────────────────────────────────────────

function createVehicleIcon(status: DbVehicle["status"]) {
  const color =
    status === "collecting" ? "#3b82f6"
    : status === "available" ? "#16a34a"
    : status === "returning" ? "#8b5cf6"
    : status === "maintenance" ? "#ef4444"
    : "#6b7280";

  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<div style="
      width: 28px;
      height: 28px;
      background: ${color};
      border: 3px solid white;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    </div>`,
  });
}

interface VehicleMarkerProps {
  vehicle: DbVehicle;
}

export function VehicleMarker({ vehicle }: VehicleMarkerProps) {
  const utilizationPct = Math.round((vehicle.current_load_kg / vehicle.capacity_kg) * 100);

  const statusLabel: Record<DbVehicle["status"], string> = {
    available: "Available",
    collecting: "Collecting",
    returning: "Returning",
    maintenance: "In Maintenance",
    offline: "Offline",
  };

  return (
    <Marker
      position={[vehicle.latitude, vehicle.longitude]}
      icon={createVehicleIcon(vehicle.status)}
    >
      <Popup maxWidth={260} minWidth={220} closeButton={false}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">{vehicle.id}</span>
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-medium"
              style={{
                background:
                  vehicle.status === "collecting" ? "#eff6ff"
                  : vehicle.status === "available" ? "#f0fdf4"
                  : vehicle.status === "maintenance" ? "#fef2f2"
                  : "#f5f3ff",
                color:
                  vehicle.status === "collecting" ? "#1d4ed8"
                  : vehicle.status === "available" ? "#15803d"
                  : vehicle.status === "maintenance" ? "#dc2626"
                  : "#7c3aed",
              }}
            >
              {statusLabel[vehicle.status]}
            </span>
          </div>

          <p className="text-xs text-muted-foreground mb-1">{vehicle.vehicle_number}</p>
          <p className="text-xs font-medium mb-3">Driver: {vehicle.driver_name}</p>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Load</span>
              <span className="font-medium">{vehicle.current_load_kg} / {vehicle.capacity_kg} kg</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${utilizationPct}%`,
                  backgroundColor:
                    utilizationPct >= 85 ? "#ef4444"
                    : utilizationPct >= 60 ? "#f59e0b"
                    : "#3b82f6",
                }}
              />
            </div>
            <p className="text-[11px] text-right text-muted-foreground">{utilizationPct}% utilized</p>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ─── Route Polyline ───────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

interface RoutePolylineProps {
  waypoints: Array<{ latitude: number; longitude: number; id: string }>;
  isSimulating?: boolean;
  activeVehicle?: DbVehicle;
}

export function RoutePolyline({ waypoints, isSimulating, activeVehicle }: RoutePolylineProps) {
  const [positions, setPositions] = useState<[number, number][]>([]);
  const [simIndex, setSimIndex] = useState(0);

  useEffect(() => {
    if (waypoints.length < 2) {
      setPositions([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const coords = waypoints.map(w => `${w.longitude},${w.latitude}`).join(';');
        const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
        
        if (!res.ok) throw new Error("OSRM routing failed");
        
        const data = await res.json();
        if (data.routes && data.routes[0]) {
          const coordinates = data.routes[0].geometry.coordinates;
          // OSRM returns [longitude, latitude], Leaflet Polyline expects [latitude, longitude]
          setPositions(coordinates.map((c: [number, number]) => [c[1], c[0]]));
        } else {
          setPositions(waypoints.map((w) => [w.latitude, w.longitude] as [number, number]));
        }
      } catch (err) {
        console.error("Failed to fetch road route:", err);
        // Fallback to straight lines if API fails
        setPositions(waypoints.map((w) => [w.latitude, w.longitude] as [number, number]));
      }
    };

    fetchRoute();
  }, [waypoints]);

  // Simulation animation loop
  useEffect(() => {
    if (!isSimulating || positions.length === 0) {
      setSimIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setSimIndex((prev) => {
        if (prev >= positions.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 80); // Move every 80ms

    return () => clearInterval(interval);
  }, [isSimulating, positions]);

  if (positions.length === 0) return null;

  return (
    <>
      <Polyline
        positions={positions}
        pathOptions={{
          color: "#3b82f6",
          weight: 4,
          opacity: 0.8,
        }}
      />
      
      {/* Moving vehicle marker during simulation */}
      {isSimulating && activeVehicle && positions[simIndex] && (
        <Marker 
          position={positions[simIndex]} 
          icon={createVehicleIcon(activeVehicle.status)}
          zIndexOffset={1000}
        />
      )}
    </>
  );
}

// ─── Route Order Marker ───────────────────────────────────────────────────────

interface OrderMarkerProps {
  position: [number, number];
  order: number;
}

export function OrderMarker({ position, order }: OrderMarkerProps) {
  const icon = L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div style="
      width: 22px;
      height: 22px;
      background: #3b82f6;
      border: 2px solid white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: bold;
      color: white;
      box-shadow: 0 2px 6px rgba(59,130,246,0.5);
    ">${order}</div>`,
  });

  return <Marker position={position} icon={icon} />;
}
