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

const STATUS_BADGE_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  healthy: { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500" },
  warning: { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500" },
  critical: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", dot: "bg-red-500 animate-pulse" },
};

export function SmartBinScene(props: SmartBinModelProps) {
  const activeAngle = useBin3DStore((state) => state.activeAngle);
  const badgeStyle = STATUS_BADGE_COLORS[props.status] || STATUS_BADGE_COLORS.healthy;

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-xl overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 select-none">
      {/* Crisp Vector-Sharp 2D Overlay Telemetry Badge */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900/90 border border-slate-700/80 backdrop-blur-md shadow-xl text-xs pointer-events-none">
        <span className={`h-2.5 w-2.5 rounded-full ${badgeStyle.dot}`} />
        <span className="font-bold font-mono text-white text-sm tracking-wide">{props.binId}</span>
        <span className="text-slate-600 font-light">|</span>
        <span className="text-sky-400 font-semibold">{props.wasteType}</span>
        <span className="text-slate-600 font-light">|</span>
        <span className="font-mono font-bold text-slate-200">{props.fillLevel}% Fill</span>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 0.9, 3.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Studio & Ambient Lighting */}
          <ambientLight intensity={0.65} />
          <hemisphereLight intensity={0.45} color="#38bdf8" groundColor="#0f172a" />
          
          <directionalLight
            position={[4, 6, 4]}
            intensity={1.6}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-2.5}
            shadow-camera-right={2.5}
            shadow-camera-top={2.5}
            shadow-camera-bottom={-2.5}
          />
          <pointLight position={[-3, 2, -2]} intensity={0.9} color="#0284c7" />

          {/* Floating Smart Bin Assembly */}
          <Float
            speed={1.2}
            rotationIntensity={0.03}
            floatIntensity={0.08}
            floatingRange={[0.02, 0.06]}
          >
            <SmartBinModel {...props} activeAngle={activeAngle} />
          </Float>

          {/* Soft Ground Contact Shadows */}
          <ContactShadows
            position={[0, 0, 0]}
            opacity={0.7}
            scale={5}
            blur={2.2}
            far={1.8}
            color="#020617"
          />

          {/* Grid Ground Floor Plate */}
          <gridHelper args={[10, 20, "#334155", "#1e293b"]} position={[0, -0.005, 0]} />

          {/* Preset Environment HDRI Lighting */}
          <Environment preset="city" />

          {/* Camera View Controls */}
          <SmartBinControls activeAngle={activeAngle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
