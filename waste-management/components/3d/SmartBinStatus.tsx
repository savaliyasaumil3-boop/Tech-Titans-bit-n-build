"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface SmartBinStatusProps {
  status: "healthy" | "warning" | "critical";
  fillLevel: number;
  binHeight?: number;
}

const STATUS_COLORS = {
  healthy: "#22c55e",  // green
  warning: "#f59e0b",  // amber
  critical: "#ef4444", // red
};

export function SmartBinStatus({
  status,
  fillLevel,
  binHeight = 1.32,
}: SmartBinStatusProps) {
  const ledRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);

  const activeColor = STATUS_COLORS[status] || STATUS_COLORS.healthy;

  // Pulsing animation for critical status LED & ground ring
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    if (ledRef.current) {
      const pulse = status === "critical" ? 0.6 + Math.sin(t * 6) * 0.4 : 0.9;
      (ledRef.current.material as THREE.MeshStandardMaterial).emissiveIntensity = pulse * 2.5;
    }

    if (ringRef.current) {
      const ringScale = status === "critical" ? 1 + Math.sin(t * 3) * 0.08 : 1;
      ringRef.current.scale.set(ringScale, ringScale, 1);
    }

    if (beamRef.current) {
      const beamAlpha = 0.2 + Math.sin(t * 4) * 0.15;
      (beamRef.current.material as THREE.MeshBasicMaterial).opacity = beamAlpha;
    }
  });

  return (
    <group>
      {/* Front Panel Smart Sensor LED Indicator */}
      <mesh
        ref={ledRef}
        position={[0, binHeight * 0.86, 0.40]}
        castShadow={false}
      >
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshStandardMaterial
          color={activeColor}
          emissive={activeColor}
          emissiveIntensity={1.8}
          roughness={0.1}
        />
      </mesh>

      {/* Point Light emitted from Status LED */}
      <pointLight
        position={[0, binHeight * 0.86, 0.44]}
        color={activeColor}
        intensity={status === "critical" ? 2.5 : 1.2}
        distance={1.4}
      />



      {/* Ground Holographic Status Risk Ring */}
      <mesh
        ref={ringRef}
        position={[0, -0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.65, 0.78, 32]} />
        <meshBasicMaterial
          color={activeColor}
          transparent
          opacity={status === "critical" ? 0.7 : 0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
