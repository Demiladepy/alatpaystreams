"use client";

import { AlertTriangle } from "lucide-react";
import { getApiBaseUrl, isMockMode } from "@/lib/api";

export function MockModeBanner() {
  const noApi = !getApiBaseUrl();
  const mockActive = isMockMode();

  if (!noApi && !mockActive) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning-subtle px-4 py-3 text-small text-ink-secondary">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
      <div>
        <p className="font-medium text-ink-primary">Demo data mode</p>
        <p className="mt-0.5 text-ink-tertiary">
          {noApi
            ? "NEXT_PUBLIC_API_URL is not set — showing mock Funke data."
            : "API unreachable — fell back to mock data. Start the backend on :3000."}
        </p>
      </div>
    </div>
  );
}
