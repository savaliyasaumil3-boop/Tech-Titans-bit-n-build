"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Text, Billboard } from "@react-three/drei";
import * as THREE from "three";

interface SmartBinFillProps {
  fillLevel: number; // 0 to 100
  wasteType?: string;
  binHeight?: number;
  binWidth?: number;
  isInsideView?: boolean;
}

// Color Palette for Fill Status
const COLOR_HEALTHY = "#10b981"; // Emerald Green (0 - 33%)
const COLOR_WARNING = "#f59e0b"; // Amber (34 - 66%)
const COLOR_CRITICAL = "#ef4444"; // Vivid Red (67 - 100%)

// Waste Type Colors
const STREAM_COLORS: Record<string, string> = {
  Organic: "#15803d",
  Plastic: "#0284c7",
  Metal: "#0369a1",
  Paper: "#0ea5e9",
  Glass: "#0d9488",
  "E-Waste": "#4f46e5",
  Other: "#0284c7",
};

export function SmartBinFill({
  fillLevel,
  wasteType = "Plastic",
  binHeight = 1.22,
  binWidth = 0.84,
  isInsideView = false,
}: SmartBinFillProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const laserBeamRef = useRef<THREE.Mesh>(null);
  const surfaceGridRef = useRef<THREE.Group>(null);
  const laserRingRef = useRef<THREE.Group>(null);

  // Clamp fill level metrics
  const clampedFill = Math.max(0, Math.min(100, fillLevel));
  const fillRatio = clampedFill / 100;
  
  // Height math (matching chassis inner dimensions)
  const bottomY = 0.06;
  const maxFillHeight = 1.14;
  const currentFillHeight = Math.max(0.05, maxFillHeight * fillRatio);

  const topSurfaceY = bottomY + currentFillHeight;
  const fillCenterY = bottomY + currentFillHeight / 2;
  const sensorY = binHeight * 0.98 + 0.06;
  const laserDistance = Math.max(0.04, sensorY - topSurfaceY);
  const laserCenterY = topSurfaceY + laserDistance / 2;

  // Active status color
  const activeColor =
    clampedFill >= 67 ? COLOR_CRITICAL : clampedFill >= 34 ? COLOR_WARNING : COLOR_HEALTHY;
  const streamColor = STREAM_COLORS[wasteType] || "#0284c7";

  // Pre-generate low-poly 3D trash debris objects on the top surface
  const trashItems = useMemo(() => {
    const items = [];
    const count = Math.min(12, Math.floor(clampedFill / 8) + 3);
    const rng = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < count; i++) {
      const rx = (rng(i * 1.1) - 0.5) * (binWidth * 0.65);
      const rz = (rng(i * 2.3) - 0.5) * (binWidth * 0.55);
      const scale = 0.04 + rng(i * 3.7) * 0.06;
      const rotX = rng(i * 4.1) * Math.PI;
      const rotY = rng(i * 5.2) * Math.PI;
      const shapeType = i % 3; // 0: box, 1: cylinder, 2: sphere

      items.push({ id: i, rx, rz, scale, rotX, rotY, shapeType });
    }
    return items;
  }, [clampedFill, binWidth]);

  // Frame animation loop
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();

    // Pulse laser beam & scanner grid
    if (laserBeamRef.current) {
      (laserBeamRef.current.material as THREE.MeshBasicMaterial).opacity =
        0.45 + Math.sin(t * 6) * 0.25;
    }
    if (surfaceGridRef.current) {
      surfaceGridRef.current.rotation.z = t * 0.4;
    }
    // Hover laser level ring
    if (laserRingRef.current) {
      laserRingRef.current.position.y = topSurfaceY + Math.sin(t * 3) * 0.006;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. OPAQUE Solid Volumetric 3D Waste Mass Block (Spans from bottom base floor y=0.06 up to topSurfaceY) */}
      <mesh ref={meshRef} position={[0, fillCenterY, 0]} castShadow receiveShadow>
        <boxGeometry args={[binWidth * 0.86, currentFillHeight, binWidth * 0.74]} />
        <meshStandardMaterial
          color={activeColor}
          roughness={0.3}
          metalness={0.2}
          emissive={activeColor}
          emissiveIntensity={0.25}
          transparent={false}
        />
      </mesh>

      {/* 1b. Outer Edge Highlights on the 3D Waste Block for volumetric depth */}
      <lineSegments position={[0, fillCenterY, 0]}>
        <edgesGeometry args={[new THREE.BoxGeometry(binWidth * 0.86, currentFillHeight, binWidth * 0.74)]} />
        <lineBasicMaterial color="#ffffff" transparent opacity={0.4} linewidth={2} />
      </lineSegments>

      {/* 2. Top Waste Surface Cap */}
      <mesh position={[0, topSurfaceY + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[binWidth * 0.85, binWidth * 0.73]} />
        <meshStandardMaterial
          color={activeColor}
          roughness={0.2}
          side={THREE.DoubleSide}
          emissive={activeColor}
          emissiveIntensity={0.5}
          transparent={false}
        />
      </mesh>

      {/* 3. Textured 3D Low-Poly Waste Debris Scatter on Top Surface */}
      <group position={[0, topSurfaceY + 0.02, 0]}>
        {trashItems.map((item) => (
          <mesh
            key={item.id}
            position={[item.rx, item.scale / 2, item.rz]}
            rotation={[item.rotX, item.rotY, 0]}
            castShadow
          >
            {item.shapeType === 0 ? (
              <boxGeometry args={[item.scale, item.scale, item.scale]} />
            ) : item.shapeType === 1 ? (
              <cylinderGeometry args={[item.scale * 0.5, item.scale * 0.6, item.scale * 1.2, 8]} />
            ) : (
              <dodecahedronGeometry args={[item.scale * 0.6]} />
            )}
            <meshStandardMaterial
              color={item.id % 2 === 0 ? streamColor : activeColor}
              roughness={0.5}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>

      {/* 4. Ultrasonic Sensor Target Beam & Scanning Radar Surface */}
      <mesh ref={laserBeamRef} position={[0, laserCenterY, 0]}>
        <cylinderGeometry args={[0.015, 0.08, laserDistance, 16]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.5} />
      </mesh>

      {/* Scanning Target Grid on Top Surface */}
      <group ref={surfaceGridRef} position={[0, topSurfaceY + 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.22, 24]} />
        <meshBasicMaterial color={activeColor} transparent opacity={0.7} side={THREE.DoubleSide} />
      </group>

      {/* 5. IMPRESSIVE EXTERIOR 3D HORIZONTAL LASER LEVEL RING (Wraps around Chassis at exact fill height) */}
      <group ref={laserRingRef} position={[0, topSurfaceY, 0]}>
        {/* Horizontal Laser Line Frame */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.96, 0.84]} />
          <meshBasicMaterial color={activeColor} transparent opacity={0.25} side={THREE.DoubleSide} />
        </mesh>
        {/* Glowing Laser Border Lines (4 Outer Edges) */}
        <mesh position={[0, 0, 0.422]}>
          <boxGeometry args={[0.96, 0.012, 0.012]} />
          <meshBasicMaterial color={activeColor} />
        </mesh>
        <mesh position={[0, 0, -0.422]}>
          <boxGeometry args={[0.96, 0.012, 0.012]} />
          <meshBasicMaterial color={activeColor} />
        </mesh>
        <mesh position={[0.482, 0, 0]}>
          <boxGeometry args={[0.012, 0.012, 0.84]} />
          <meshBasicMaterial color={activeColor} />
        </mesh>
        <mesh position={[-0.482, 0, 0]}>
          <boxGeometry args={[0.012, 0.012, 0.84]} />
          <meshBasicMaterial color={activeColor} />
        </mesh>
      </group>

      {/* 6. FRONT PILLAR HIGH-CONTRAST 3D RULER SCALE & LED TICK MARKS */}
      <group position={[0.47, 0, 0.40]}>
        {[0, 25, 50, 75, 100].map((mark) => {
          const markY = bottomY + (maxFillHeight * mark) / 100;
          const isReached = clampedFill >= mark;
          const tickColor = isReached ? activeColor : "#475569";

          return (
            <group key={mark} position={[0, markY, 0]}>
              {/* LED Tick Bar */}
              <mesh position={[0.02, 0, 0]}>
                <boxGeometry args={[0.06, 0.012, 0.02]} />
                <meshBasicMaterial color={tickColor} />
              </mesh>
              {/* Crisp 3D Metric Text */}
              <Text
                position={[0.06, 0, 0]}
                fontSize={0.055}
                color={isReached ? "#ffffff" : "#94a3b8"}
                anchorX="left"
                anchorY="middle"
              >
                {`${mark}%`}
              </Text>
            </group>
          );
        })}
      </group>

      {/* 7. INNER CORNER LED LEVEL STRIPS (Vertical Battery-Style Gauge inside bin corners) */}
      <group position={[-0.39, 0, -0.33]}>
        {[1, 2, 3, 4].map((seg) => {
          const segThreshold = seg * 25;
          const segY = bottomY + (maxFillHeight * (seg - 0.5)) / 4;
          const isLit = clampedFill >= segThreshold - 12;
          const segColor =
            seg === 4 ? COLOR_CRITICAL : seg === 3 ? COLOR_WARNING : COLOR_HEALTHY;

          return (
            <mesh key={seg} position={[0, segY, 0]}>
              <boxGeometry args={[0.02, (maxFillHeight / 4) * 0.8, 0.02]} />
              <meshBasicMaterial
                color={isLit ? segColor : "#1e293b"}
                transparent
                opacity={isLit ? 0.95 : 0.3}
              />
            </mesh>
          );
        })}
      </group>

      {/* 8. Sleek Dynamic Floating 3D Telemetry HUD Tag */}
      <Billboard position={[0, topSurfaceY + 0.18, 0]}>
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[0.76, 0.18]} />
          <meshBasicMaterial color="#020617" transparent opacity={0.92} />
        </mesh>
        <mesh position={[0, 0, 0.001]}>
          <planeGeometry args={[0.78, 0.20]} />
          <meshBasicMaterial color={activeColor} transparent opacity={0.85} />
        </mesh>
        <Text
          position={[0, 0.035, 0.002]}
          fontSize={0.07}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          {`${clampedFill}% FILLED`}
        </Text>
        <Text
          position={[0, -0.038, 0.002]}
          fontSize={0.042}
          color="#cbd5e1"
          anchorX="center"
          anchorY="middle"
        >
          {clampedFill >= 67
            ? "CRITICAL OVERFLOW RISK"
            : clampedFill >= 34
            ? "MODERATE PAYLOAD"
            : "OPTIMAL CAPACITY"}
        </Text>
      </Billboard>

      {/* 9. Internal Point Light Source for Interior Illumination */}
      <pointLight
        position={[0, topSurfaceY + 0.15, 0]}
        color={activeColor}
        intensity={isInsideView ? 2.8 : 1.2}
        distance={1.6}
      />
    </group>
  );
}

