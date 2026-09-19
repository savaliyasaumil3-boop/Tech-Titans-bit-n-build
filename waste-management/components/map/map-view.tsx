"use client";

import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { BinMarker } from "./bin-marker";
import { MapLegend } from "./map-legend";
import type { SmartBin } from "@/lib/types";

interface MapViewProps {
  bins: SmartBin[];
}

function FitBounds({ bins }: { bins: SmartBin[] }) {
  const map = useMap();

  if (bins.length > 0) {
    const bounds = bins.map((b) => [b.lat, b.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
  }

  return null;
}

export function MapView({ bins }: MapViewProps) {
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
        {bins.map((bin) => (
          <BinMarker key={bin.id} bin={bin} />
        ))}
        <MapLegend bins={bins} />
      </MapContainer>
    </div>
  );
}
