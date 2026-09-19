"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useLiveBins } from "@/lib/hooks/use-live-bins";
import { smartBins } from "@/lib/mock-data";
import type { SmartBin } from "@/lib/types";

interface LiveDataContextValue {
  bins: SmartBin[];
  lastUpdated: Date;
  isLive: boolean;
  setIsLive: (v: boolean) => void;
}

const LiveDataContext = createContext<LiveDataContextValue | null>(null);

export function LiveDataProvider({ children }: { children: ReactNode }) {
  const { bins, lastUpdated, isLive, setIsLive } = useLiveBins(smartBins);

  return (
    <LiveDataContext.Provider value={{ bins, lastUpdated, isLive, setIsLive }}>
      {children}
    </LiveDataContext.Provider>
  );
}

export function useLiveData() {
  const ctx = useContext(LiveDataContext);
  if (!ctx) {
    throw new Error("useLiveData must be used within a LiveDataProvider");
  }
  return ctx;
}
