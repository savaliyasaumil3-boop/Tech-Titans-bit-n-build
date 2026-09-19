import { create } from "zustand";

export type InspectionAngle = "front" | "top" | "side" | "inside";

interface Bin3DState {
  selectedBinId: string | null;
  isOpen: boolean;
  activeAngle: InspectionAngle;
  isLidOpen: boolean;
  simulatedFill: number | null; // Allows user to override fill level for testing in 3D
  
  // Actions
  open3DViewer: (binId: string) => void;
  close3DViewer: () => void;
  selectBin: (binId: string) => void;
  setActiveAngle: (angle: InspectionAngle) => void;
  toggleLid: () => void;
  setSimulatedFill: (fill: number | null) => void;
}

export const useBin3DStore = create<Bin3DState>((set) => ({
  selectedBinId: null,
  isOpen: false,
  activeAngle: "front",
  isLidOpen: false,
  simulatedFill: null,

  open3DViewer: (binId: string) =>
    set({
      selectedBinId: binId,
      isOpen: true,
      activeAngle: "front",
      isLidOpen: false,
      simulatedFill: null,
    }),

  close3DViewer: () =>
    set({
      isOpen: false,
      selectedBinId: null,
      simulatedFill: null,
    }),

  selectBin: (binId: string) =>
    set({
      selectedBinId: binId,
      simulatedFill: null,
    }),

  setActiveAngle: (angle: InspectionAngle) =>
    set({
      activeAngle: angle,
      isLidOpen: angle === "top",
    }),

  toggleLid: () =>
    set((state) => ({ isLidOpen: !state.isLidOpen })),

  setSimulatedFill: (fill: number | null) =>
    set({ simulatedFill: fill }),
}));
