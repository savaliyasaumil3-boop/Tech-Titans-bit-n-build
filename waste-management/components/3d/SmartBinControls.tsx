"use client";

import { useEffect, useRef } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { OrbitControls as DreiOrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { InspectionAngle } from "@/lib/store/use-bin-3d-store";

interface SmartBinControlsProps {
  activeAngle: InspectionAngle;
}

const CAMERA_POSITIONS: Record<InspectionAngle, [number, number, number]> = {
  front: [0, 1.1, 3.8],
  side: [3.8, 1.1, 0],
  top: [0, 4.2, 0.2],
  inside: [0, 1.0, 2.9],
};

const CAMERA_TARGETS: Record<InspectionAngle, [number, number, number]> = {
  front: [0, 0.68, 0],
  side: [0, 0.68, 0],
  top: [0, 0.68, 0],
  inside: [0, 0.50, 0],
};

export function SmartBinControls({ activeAngle }: SmartBinControlsProps) {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const { camera } = useThree();

  const targetPos = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_POSITIONS[activeAngle]));
  const targetLook = useRef<THREE.Vector3>(new THREE.Vector3(...CAMERA_TARGETS[activeAngle]));

  useEffect(() => {
    targetPos.current.set(...CAMERA_POSITIONS[activeAngle]);
    targetLook.current.set(...CAMERA_TARGETS[activeAngle]);
  }, [activeAngle]);

  // Smooth lerp camera position to active inspection angle
  useFrame(() => {
    if (controlsRef.current) {
      camera.position.lerp(targetPos.current, 0.08);
      controlsRef.current.target.lerp(targetLook.current, 0.08);
      controlsRef.current.update();
    }
  });

  return (
    <DreiOrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      minDistance={1.8}
      maxDistance={6.5}
      minPolarAngle={0.1}
      maxPolarAngle={Math.PI / 2 + 0.05}
      autoRotate={activeAngle === "front"}
      autoRotateSpeed={0.8}
    />
  );
}
