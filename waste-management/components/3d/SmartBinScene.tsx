"use client";

import { Suspense, useEffect, useState } from "react";
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

  // Dynamic theme detection
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    updateTheme();

    const observer = new MutationObserver(() => updateTheme());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      className={`relative w-full h-full min-h-[380px] rounded-xl overflow-hidden select-none transition-colors duration-300 ${
        isDark
          ? "bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
          : "bg-gradient-to-b from-slate-100 via-sky-50 to-slate-200"
      }`}
    >
      {/* Crisp 2D Overlay Telemetry Badge */}
      <div
        className={`absolute top-4 left-4 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-xl backdrop-blur-md shadow-xl text-xs pointer-events-none transition-colors duration-300 ${
          isDark
            ? "bg-slate-900/90 border border-slate-700/80 text-white"
            : "bg-white/90 border border-slate-200/90 text-slate-900 shadow-md"
        }`}
      >
        <span className={`h-2.5 w-2.5 rounded-full ${badgeStyle.dot}`} />
        <span className={`font-bold font-mono text-sm tracking-wide ${isDark ? "text-white" : "text-slate-900"}`}>
          {props.binId}
        </span>
        <span className={isDark ? "text-slate-600 font-light" : "text-slate-300 font-light"}>|</span>
        <span className={`font-semibold ${isDark ? "text-sky-400" : "text-sky-600"}`}>{props.wasteType}</span>
        <span className={isDark ? "text-slate-600 font-light" : "text-slate-300 font-light"}>|</span>
        <span className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
          {props.fillLevel}% Fill
        </span>
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 0.9, 3.4], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={null}>
          {/* Studio & Ambient Lighting — dynamically adapted to theme */}
          <ambientLight intensity={isDark ? 0.65 : 0.9} />
          <hemisphereLight
            intensity={isDark ? 0.45 : 0.65}
            color={isDark ? "#38bdf8" : "#ffffff"}
            groundColor={isDark ? "#0f172a" : "#cbd5e1"}
          />

          <directionalLight
            position={[4, 6, 4]}
            intensity={isDark ? 1.6 : 1.9}
            castShadow
            shadow-mapSize={[1024, 1024]}
            shadow-camera-left={-2.5}
            shadow-camera-right={2.5}
            shadow-camera-top={2.5}
            shadow-camera-bottom={-2.5}
          />
          <pointLight
            position={[-3, 2, -2]}
            intensity={isDark ? 0.9 : 0.6}
            color={isDark ? "#0284c7" : "#0284c7"}
          />

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
            opacity={isDark ? 0.7 : 0.45}
            scale={5}
            blur={2.2}
            far={1.8}
            color={isDark ? "#020617" : "#475569"}
          />

          {/* Grid Ground Floor Plate — theme-adjusted colors */}
          <gridHelper
            args={[10, 20, isDark ? "#334155" : "#94a3b8", isDark ? "#1e293b" : "#cbd5e1"]}
            position={[0, -0.005, 0]}
          />

          {/* Preset Environment HDRI Lighting — City for dark, Dawn/Apartment for light */}
          <Environment preset={isDark ? "city" : "dawn"} />

          {/* Camera View Controls */}
          <SmartBinControls activeAngle={activeAngle} />
        </Suspense>
      </Canvas>
    </div>
  );
}
