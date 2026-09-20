"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";
import type { WasteHotspot, DbWasteSource } from "@/lib/db-types";
import { Layers } from "lucide-react";

interface WasteSourceMapProps {
  hotspots?: WasteHotspot[];
  sources?: DbWasteSource[];
  onSelectSource: (sourceId: string) => void;
  selectedSourceId?: string | null;
  height?: string;
}

export function WasteSourceMap({
  hotspots = [],
  sources = [],
  onSelectSource,
  selectedSourceId,
  height = "h-[500px]",
}: WasteSourceMapProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className={`w-full ${height} bg-card rounded-2xl border border-border flex items-center justify-center`}>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Layers className="w-5 h-5 animate-spin" />
          <span>Loading SwachhSetu Hotspot Map...</span>
        </div>
      </div>
    );
  }

  // Center on Ahmedabad
  const center: [number, number] = [23.0225, 72.5714];

  const getHotspotColor = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case "critical":
        return "#ef4444"; // red
      case "high":
        return "#f97316"; // orange
      case "medium":
        return "#eab308"; // yellow
      default:
        return "#10b981"; // green
    }
  };

  const createCustomIcon = (risk: string, stype: string) => {
    const color = getHotspotColor(risk);
    const isCritical = risk?.toLowerCase() === "critical";

    return L.divIcon({
      className: "custom-source-pin",
      html: `
        <div style="
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid white;
          box-shadow: 0 0 ${isCritical ? "12px 4px" : "6px 2px"} ${color}aa;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 11px;
          cursor: pointer;
        ">
          ${stype.charAt(0).toUpperCase()}
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  };

  const items = hotspots.length > 0 ? hotspots : sources;

  return (
    <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-border shadow-md bg-card`}>
      <MapContainer center={center} zoom={12} className="w-full h-full z-0">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {items.map((item: any) => {
          const lat = item.latitude;
          const lng = item.longitude;
          if (!lat || !lng) return null;

          const risk = item.overflow_risk || item.priority || "medium";
          const stype = item.source_type || "commercial";
          const color = getHotspotColor(risk);

          return (
            <React.Fragment key={item.id}>
              {/* Heat radius circle */}
              <Circle
                center={[lat, lng]}
                radius={(item.predicted_quantity_kg || item.estimated_daily_generation_kg || 500) * 0.8}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: 0.18,
                  color: color,
                  opacity: 0.4,
                  weight: 1,
                }}
              />
              <Marker
                position={[lat, lng]}
                icon={createCustomIcon(risk, stype)}
                eventHandlers={{
                  click: () => onSelectSource(item.id),
                }}
              >
                <Popup className="dark-popup">
                  <div className="p-2 min-w-[200px] text-foreground">
                    <div className="flex items-center justify-between gap-2 border-b border-border pb-1 mb-2">
                      <span className="font-semibold text-sm truncate text-foreground">{item.name}</span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase text-white"
                        style={{ backgroundColor: color }}
                      >
                        {risk}
                      </span>
                    </div>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="text-muted-foreground font-semibold">Type:</span> {stype.toUpperCase()} ({item.industry_type || "General"})
                      </p>
                      <p>
                        <span className="text-muted-foreground font-semibold">Predicted Waste:</span>{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">{item.predicted_quantity_kg || item.estimated_daily_generation_kg} kg</strong>
                      </p>
                      <p>
                        <span className="text-muted-foreground font-semibold">Dominant Type:</span> {item.predicted_waste_type || "Organic"}
                      </p>
                    </div>
                    <button
                      onClick={() => onSelectSource(item.id)}
                      className="mt-3 w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                    >
                      View Supervisor Planning &rarr;
                    </button>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Map Legend Floating Widget */}
      <div className="absolute bottom-4 left-4 z-10 bg-card/90 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg text-xs text-foreground space-y-1.5">
        <span className="font-semibold text-foreground block border-b border-border pb-1">Hotspot Generation Risk</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500 shadow-xs shadow-red-500/50"></span>
          <span>Critical (&gt; 1500 kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-orange-500 shadow-xs shadow-orange-500/50"></span>
          <span>High (800–1500 kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-yellow-500 shadow-xs shadow-yellow-500/50"></span>
          <span>Medium (400–800 kg)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-xs shadow-emerald-500/50"></span>
          <span>Low (&lt; 400 kg)</span>
        </div>
      </div>
    </div>
  );
}
