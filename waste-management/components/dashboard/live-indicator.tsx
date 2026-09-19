"use client";

import { useState, useEffect } from "react";
import { useAppData } from "@/components/providers/app-data-provider";
import { Button } from "@/components/ui/button";
import { WifiOff } from "lucide-react";

export function LiveIndicator() {
  const { lastUpdated, isLive, setIsLive } = useAppData();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => setIsLive(!isLive)}
      >
        {isLive ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-green-600 font-medium">Live</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Paused</span>
          </>
        )}
      </Button>
      <span className="text-xs text-muted-foreground" suppressHydrationWarning>
        {mounted ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Updated just now"}
      </span>
    </div>
  );
}
