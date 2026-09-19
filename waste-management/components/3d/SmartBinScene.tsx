"use client";

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  ContactShadows,
  Float,
  Environment,
} from "@react-three/drei";
import { SmartBinModel, type SmartBinModelProps } from "./SmartBinModel";
import { SmartBinControls } from "./SmartBinControls";
import { useBin3DStore } from "@/lib/store/use-bin-3d-store";

export function SmartBinScene(props: SmartBinModelProps) {
  const activeAngle = useBin3DStore((state) => state.activeAngle);

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none">
      <Canvas
        shadows
        camera={{ position: [0, 0.8, 2.2], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Studio & Ambient Lighting */}
          <ambientLight intensity={0.6} />
          <hemisphereLight intensity={0.4} color="#38bdf8" groundColor="#0f172a" />
          
          <directionalLight
            position={[4, 6, 4]}
            intensity={1.5}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-2}
            shadow-camera-right={2}
            shadow-camera-top={2}
            shadow-camera-bottom={-2}
          />
          <pointLight position={[-3, 2, -2]} intensity={0.8} color="#0284c7" />

          {/* Floating Smart Bin Assembly */}
          <Float
            speed={1.5}
            rotationIntensity={0.05}
            floatIntensity={0.1}
            floatingRange={[0.02, 0.08]}
          >
            <SmartBinModel {...props} />
          </Float>

          {/* Soft Ground Contact Shadows */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.65}
            scale={4}
            blur={2}
            far={1.5}
            color="#020617"
          />

          {/* Grid Ground Floor Plate */}
          <gridHelper args={[8, 16, "#334155", "#1e293b"]} position={[0, -0.005, 0]} />

          {/* Preset Environment HDRI Lighting */}
          <Environment preset="city" />

          {/* Camera View Controls */}
          <SmartBinControls activeAngle={activeAngle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
