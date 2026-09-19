"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SmartBinFillProps {
  fillLevel: number; // 0 to 100
  wasteType?: string;
  binHeight?: number;
  binWidth?: number;
}

const WASTE_TYPE_COLORS: Record<string, string> = {
  Plastic: "#0ea5e9",
  Organic: "#16a34a",
  Metal: "#8b5cf6",
  Paper: "#f59e0b",
  Glass: "#ec4899",
  "E-Waste": "#ef4444",
  Other: "#6b7280",
};

export function SmartBinFill({
  fillLevel,
  wasteType = "Plastic",
  binHeight = 1.0,
  binWidth = 0.54,
}: SmartBinFillProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = WASTE_TYPE_COLORS[wasteType] || "#0ea5e9";

  // Calculate procedural fill height (scaled slightly inside bin container)
  const clampedFill = Math.max(2, Math.min(100, fillLevel));
  const fillRatio = clampedFill / 100;
  const currentFillHeight = Math.max(0.04, binHeight * fillRatio * 0.95);
  // Center Y position of fill cylinder/box
  const fillY = currentFillHeight / 2 + 0.02;

  // Gentle wave/pulse animation on fill surface
  useFrame(({ clock }) => {
    if (meshRef.current) {
      const t = clock.getElapsedTime();
      meshRef.current.rotation.y = Math.sin(t * 0.5) * 0.05;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 3D Waste Fill Volume */}
      <mesh
        ref={meshRef}
        position={[0, fillY, 0]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[binWidth * 0.9, currentFillHeight, binWidth * 0.9]} />
        <meshStandardMaterial
          color={color}
          roughness={0.4}
          metalness={wasteType === "Metal" ? 0.8 : 0.1}
          transparent
          opacity={0.88}
        />
      </mesh>

      {/* Top Surface Specularity Layer */}
      <mesh position={[0, fillY + currentFillHeight / 2, 0]}>
        <planeGeometry args={[binWidth * 0.88, binWidth * 0.88]} />
        <meshStandardMaterial
          color={color}
          roughness={0.2}
          side={THREE.DoubleSide}
          emissive={color}
          emissiveIntensity={fillLevel > 80 ? 0.3 : 0.1}
        />
      </mesh>

      {/* Overflow Hazard Wave Effect (When fill >= 80%) */}
      {fillLevel >= 80 && (
        <mesh position={[0, binHeight * 0.96, 0]}>
          <ringGeometry args={[binWidth * 0.3, binWidth * 0.48, 32]} />
          <meshBasicMaterial
            color="#ef4444"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
