"use client";

import { Marker, Popup } from "react-leaflet";
import L from "leaflet";
import type { SmartBin } from "@/lib/types";
import { BinPopup } from "./bin-popup";

function getMarkerColor(fillLevel: number): string {
  if (fillLevel >= 80) return "#ef4444";
  if (fillLevel >= 50) return "#f59e0b";
  return "#16a34a";
}

function createBinIcon(fillLevel: number) {
  const color = getMarkerColor(fillLevel);
  const size = fillLevel >= 80 ? 18 : 14;
  const glow = fillLevel >= 80 ? `box-shadow: 0 0 8px 3px ${color}60;` : "";

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2.5px solid white;
      border-radius: 50%;
      ${glow}
      transition: all 0.3s ease;
    "></div>`,
  });
}

interface BinMarkerProps {
  bin: SmartBin;
}

export function BinMarker({ bin }: BinMarkerProps) {
  return (
    <Marker
      position={[bin.lat, bin.lng]}
      icon={createBinIcon(bin.fillLevel)}
    >
      <Popup maxWidth={280} minWidth={240} closeButton={false}>
        <BinPopup bin={bin} />
      </Popup>
    </Marker>
  );
}
