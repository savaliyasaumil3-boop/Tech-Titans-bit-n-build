"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { SmartBinFill } from "./SmartBinFill";
import { SmartBinStatus } from "./SmartBinStatus";
import { SmartBinLabel } from "./SmartBinLabel";

export interface SmartBinModelProps {
  fillLevel: number;
  status: "healthy" | "warning" | "critical";
  wasteType: string;
  binId: string;
  isLidOpen?: boolean;
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

      const targetHeight = 1.1;
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

export function SmartBinModel({
  fillLevel,
  status,
  wasteType,
  binId,
  isLidOpen = false,
}: SmartBinModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lidRef = useRef<THREE.Group>(null);

  // Smooth lid opening animation
  useFrame(() => {
    if (lidRef.current) {
      const targetRotation = isLidOpen ? -Math.PI / 2.2 : 0;
      lidRef.current.rotation.x = THREE.MathUtils.lerp(
        lidRef.current.rotation.x,
        targetRotation,
        0.1
      );
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Loaded GLB Model Container */}
      <GLBModelLoader />

      {/* Procedural High-Detail IoT Smart Bin Outer Shell & Lid (guarantees stunning rendering) */}
      <group position={[0, 0, 0]}>
        {/* Main Translucent Bin Outer Casing */}
        <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.62, 1.08, 0.62]} />
          <meshPhysicalMaterial
            color="#1e293b"
            roughness={0.2}
            metalness={0.3}
            transmission={0.45}
            thickness={0.12}
            transparent
            opacity={0.92}
          />
        </mesh>

        {/* Front Metal Bezel Frame */}
        <mesh position={[0, 0.55, 0.315]}>
          <planeGeometry args={[0.54, 1.0]} />
          <meshStandardMaterial color="#0f172a" roughness={0.4} metalness={0.8} />
        </mesh>

        {/* Solar Panel & Sensor Node Top Lid Assembly */}
        <group ref={lidRef} position={[0, 1.1, -0.3]}>
          <mesh position={[0, 0.03, 0.3]} castShadow>
            <boxGeometry args={[0.66, 0.06, 0.66]} />
            <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
          </mesh>
          {/* Photovoltaic Solar Cell Sheet */}
          <mesh position={[0, 0.065, 0.3]}>
            <planeGeometry args={[0.5, 0.4]} />
            <meshStandardMaterial
              color="#1e1b4b"
              roughness={0.1}
              metalness={0.9}
              emissive="#312e81"
              emissiveIntensity={0.2}
            />
          </mesh>
        </group>

        {/* Heavy Industrial Rubber Base Stand */}
        <mesh position={[0, 0.02, 0]} receiveShadow>
          <boxGeometry args={[0.68, 0.04, 0.68]} />
          <meshStandardMaterial color="#090d16" roughness={0.9} />
        </mesh>
      </group>

      {/* Dynamic 3D Internal Waste Fill Volume */}
      <SmartBinFill
        fillLevel={fillLevel}
        wasteType={wasteType}
        binHeight={1.08}
        binWidth={0.58}
      />

      {/* Status LED & Ultrasonic Sensor Pulse Beam */}
      <SmartBinStatus
        status={status}
        fillLevel={fillLevel}
        binHeight={1.1}
      />

      {/* Floating 3D Telemetry Label */}
      <SmartBinLabel
        binId={binId}
        fillLevel={fillLevel}
        status={status}
        wasteType={wasteType}
        binHeight={1.1}
      />
    </group>
  );
}
