"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const ALATPAY_URL =
  process.env.NEXT_PUBLIC_ALATPAY_URL ?? "http://localhost:5500";

interface DemoBurstButtonProps {
  merchantAccountId?: string;
}

export function DemoBurstButton({
  merchantAccountId = "alatpay_funke_001",
}: DemoBurstButtonProps) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function triggerBurst() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${ALATPAY_URL}/demo/burst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantAccountId }),
      });
      const data = await res.json();
      setStatus(data.message ?? "Burst started");
    } catch {
      setStatus("Could not reach mock ALATPay — is it running on :5500?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={triggerBurst}
        disabled={loading}
        className="border-gold/40 text-forest hover:bg-gold/10"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Trigger demo burst
      </Button>
      {status && (
        <p className="max-w-xs text-right text-[11px] text-muted-foreground">
          {status}
        </p>
      )}
    </div>
  );
}
