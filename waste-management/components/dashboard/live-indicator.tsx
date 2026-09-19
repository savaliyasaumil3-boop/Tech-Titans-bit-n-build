"use client";

import { useLiveData } from "@/components/providers/live-data-provider";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff } from "lucide-react";

export function LiveIndicator() {
  const { lastUpdated, isLive, setIsLive } = useLiveData();

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
      <span className="text-xs text-muted-foreground">
        Updated {lastUpdated.toLocaleTimeString()}
      </span>
    </div>
  );
}
