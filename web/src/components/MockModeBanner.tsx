"use client";

import { AlertTriangle } from "lucide-react";
import { getApiBaseUrl, isMockMode } from "@/lib/api";

export function MockModeBanner() {
  const noApi = !getApiBaseUrl();
  const mockActive = isMockMode();

  if (!noApi && !mockActive) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div>
        <p className="font-medium">Demo data mode</p>
        <p className="mt-0.5 text-amber-900/80">
          {noApi
            ? "NEXT_PUBLIC_API_URL is not set — showing mock Funke data. Connect the backend for live splits and AI chat."
            : "API unreachable — fell back to mock data. Start the backend on :3000 and refresh."}
        </p>
      </div>
    </div>
  );
}
