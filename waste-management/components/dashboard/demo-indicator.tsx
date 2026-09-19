"use client";

import { FlaskConical } from "lucide-react";

export function DemoIndicator() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400">
      <FlaskConical className="h-3 w-3" />
      DEMO SIMULATION
    </div>
  );
}
