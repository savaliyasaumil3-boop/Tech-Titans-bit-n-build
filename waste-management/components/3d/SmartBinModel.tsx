"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SmartBinFill } from "./SmartBinFill";
import { SmartBinStatus } from "./SmartBinStatus";

export interface SmartBinModelProps {
  fillLevel: number;
  status: "healthy" | "warning" | "critical";
  wasteType: string;
  binId: string;
  isLidOpen?: boolean;
  activeAngle?: string;
}

function GLBModelLoader() {
  try {
    const { scene } = useGLTF("/models/bins/smart-bin.glb");
    const normalizedScene = useMemo(() => {
      if (!scene) return null;
      const cloned = scene.clone(true);
      const box = new THREE.Box3().setFromObject(cloned);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());

      cloned.position.x = -center.x;
      cloned.position.y = -box.min.y;
      cloned.position.z = -center.z;

      const targetHeight = 1.35;
      const maxDim = Math.max(size.x, size.y, size.z);
      if (maxDim > 0) {
        const scaleFactor = targetHeight / maxDim;
        cloned.scale.set(scaleFactor, scaleFactor, scaleFactor);
      }

      cloned.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
      return cloned;
    }, [scene]);

    return normalizedScene ? <primitive object={normalizedScene} /> : null;
  } catch {
    return null;
  }
}

const ACCENT_COLORS: Record<string, string> = {
  Organic: "#16a34a", // Green for wet/organic waste
  Plastic: "#0284c7", // Blue for dry/recyclable waste
  Metal: "#0284c7",
  Paper: "#0284c7",
  Glass: "#0284c7",
  "E-Waste": "#0284c7",
  Other: "#0284c7",
};

export function SmartBinModel({
  fillLevel,
  status,
  wasteType,
  binId,
  isLidOpen = false,
  activeAngle = "front",
}: SmartBinModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);
  const accentColor = ACCENT_COLORS[wasteType] || "#0284c7";
  const isTopOrInsideView = isLidOpen || activeAngle === "top" || activeAngle === "inside";

  // Smooth lid opening animation (silky 60fps lerp)
  useFrame(() => {
    if (lidRef.current) {
      const targetRotation = isLidOpen ? -Math.PI / 1.7 : 0;
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        targetRotation,
        0.06
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Loaded GLB Model Container */}
      <GLBModelLoader />

      {/* Large Commercial Municipal Smart Bin Assembly */}
      <group position={[0, 0, 0]}>
        {/* 1. Heavy Industrial Steel Base Plate & Rubberized Ground Mounts */}
        <mesh position={[0, 0.03, 0]} receiveShadow castShadow>
          <boxGeometry args={[0.96, 0.06, 0.86]} />
          <meshStandardMaterial color="#090d16" roughness={0.8} metalness={0.6} />
        </mesh>
        {/* Base Bumper Feet (4 Corners) */}
        <mesh position={[0.42, 0.015, 0.37]}>
          <boxGeometry args={[0.10, 0.03, 0.10]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[-0.42, 0.015, 0.37]}>
          <boxGeometry args={[0.10, 0.03, 0.10]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[0.42, 0.015, -0.37]}>
          <boxGeometry args={[0.10, 0.03, 0.10]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>
        <mesh position={[-0.42, 0.015, -0.37]}>
          <boxGeometry args={[0.10, 0.03, 0.10]} />
          <meshStandardMaterial color="#020617" roughness={0.9} />
        </mesh>

        {/* 2. Main Outer Chassis Housing (Transparent Cutaway in Top & Inside modes) */}
        <mesh position={[0, 0.68, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.90, 1.24, 0.78]} />
          <meshPhysicalMaterial
            color="#0f172a"
            roughness={isTopOrInsideView ? 0.05 : 0.25}
            metalness={isTopOrInsideView ? 0.1 : 0.5}
            transmission={isTopOrInsideView ? 0.95 : 0.20}
            thickness={0.15}
            transparent
            opacity={isTopOrInsideView ? 0.15 : 0.95}
          />
        </mesh>

        {/* 3. Waste Stream Category Accent Side Panels (Left & Right) */}
        {/* Right Side Panel */}
        <group position={[0.452, 0.68, 0]}>
          <mesh rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.70, 1.15]} />
            <meshStandardMaterial
              color={accentColor}
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={isTopOrInsideView ? 0.25 : 1}
            />
          </mesh>
          {/* Operator Side Handle */}
          <mesh position={[0.02, 0.15, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.36]} />
            <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>

        {/* Left Side Panel */}
        <group position={[-0.452, 0.68, 0]}>
          <mesh rotation={[0, -Math.PI / 2, 0]}>
            <planeGeometry args={[0.70, 1.15]} />
            <meshStandardMaterial
              color={accentColor}
              roughness={0.3}
              metalness={0.5}
              transparent
              opacity={isTopOrInsideView ? 0.25 : 1}
            />
          </mesh>
          {/* Operator Side Handle */}
          <mesh position={[-0.02, 0.15, 0]}>
            <boxGeometry args={[0.04, 0.04, 0.36]} />
            <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>

        {/* 4. Front Operator Door & Inspection Window (Hidden in Inside view for 100% clear cutaway) */}
        {!isTopOrInsideView && (
          <group position={[0, 0.68, 0.392]}>
            {/* Door Recess Bezel */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[0.82, 1.16]} />
              <meshStandardMaterial color="#1e293b" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* Translucent Cyan Glass Observation Window */}
            <mesh position={[0, -0.05, 0.003]}>
              <planeGeometry args={[0.56, 0.78]} />
              <meshPhysicalMaterial
                color="#38bdf8"
                roughness={0.1}
                transmission={0.88}
                transparent
                opacity={0.40}
              />
            </mesh>

            {/* Waste Category Stream Header Shield */}
            <mesh position={[0, 0.44, 0.005]}>
              <planeGeometry args={[0.74, 0.14]} />
              <meshStandardMaterial color={accentColor} roughness={0.2} metalness={0.6} />
            </mesh>

            {/* Front Chrome Door Handle */}
            <mesh position={[0.32, -0.05, 0.02]}>
              <boxGeometry args={[0.03, 0.22, 0.04]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.1} metalness={0.95} />
            </mesh>
          </group>
        )}

        {/* 5. Back Panel Reinforcement Frame */}
        <mesh position={[0, 0.68, -0.392]} rotation={[0, Math.PI, 0]}>
          <planeGeometry args={[0.82, 1.16]} />
          <meshStandardMaterial color="#0f172a" roughness={0.5} metalness={0.4} />
        </mesh>

        {/* 6. Heavy Steel Vertical Corner Pillars (4 Pillars) */}
        <mesh position={[0.44, 0.68, 0.38]}>
          <boxGeometry args={[0.05, 1.25, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[-0.44, 0.68, 0.38]}>
          <boxGeometry args={[0.05, 1.25, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0.44, 0.68, -0.38]}>
          <boxGeometry args={[0.05, 1.25, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[-0.44, 0.68, -0.38]}>
          <boxGeometry args={[0.05, 1.25, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.8} />
        </mesh>

        {/* 7. Solar Photovoltaic Roof & Sensor Lid Assembly */}
        <group ref={lidRef} position={[0, 1.30, -0.38]}>
          {/* Main Angled Solar Canopy Lid */}
          <mesh position={[0, 0.04, 0.38]} castShadow>
            <boxGeometry args={[0.94, 0.08, 0.84]} />
            <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.6} />
          </mesh>

          {/* Inner Protective Lid Inset */}
          <mesh position={[0, 0.07, 0.38]}>
            <boxGeometry args={[0.84, 0.04, 0.74]} />
            <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
          </mesh>

          {/* Solar Photovoltaic Sheet Grid (Lying Flat on top of lid) */}
          <mesh position={[0, 0.092, 0.38]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.72, 0.54]} />
            <meshStandardMaterial
              color="#1e1b4b"
              roughness={0.1}
              metalness={0.95}
              emissive="#312e81"
              emissiveIntensity={0.3}
            />
          </mesh>

          {/* Ultrasonic Sensor Pod Casing (Under Lid) */}
          <mesh position={[0, -0.02, 0.38]}>
            <cylinderGeometry args={[0.06, 0.07, 0.06, 16]} />
            <meshStandardMaterial color="#020617" roughness={0.2} metalness={0.9} />
          </mesh>
        </group>
      </group>

      {/* Dynamic 3D Internal Waste Fill Volume */}
      <SmartBinFill
        fillLevel={fillLevel}
        wasteType={wasteType}
        binHeight={1.22}
        binWidth={0.80}
        isInsideView={isTopOrInsideView}
      />

      {/* Status LED & Ultrasonic Sensor Pulse Beam */}
      <SmartBinStatus
        status={status}
        fillLevel={fillLevel}
        binHeight={1.32}
      />
    </group>
  );
}
