"use client";

import { useState } from "react";
import { Play, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getApiBaseUrl, simulateTransaction, MERCHANT_ID } from "@/lib/api";

const ALATPAY_URL =
  process.env.NEXT_PUBLIC_ALATPAY_URL ?? "http://localhost:5500";

const BURST_AMOUNTS = [42000, 87500, 23000, 156000, 64500];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    // Live API: fire a staggered burst of simulated payments through the
    // real split engine so buckets animate on the deployed dashboard.
    if (getApiBaseUrl()) {
      try {
        for (let i = 0; i < BURST_AMOUNTS.length; i++) {
          await simulateTransaction(MERCHANT_ID, BURST_AMOUNTS[i]);
          setStatus(`Payment ${i + 1} of ${BURST_AMOUNTS.length} split`);
          if (i < BURST_AMOUNTS.length - 1) await sleep(1200);
        }
        setStatus(`${BURST_AMOUNTS.length} payments split across ledgers`);
      } catch {
        setStatus("Burst failed — API unreachable.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Local dev: delegate to the mock ALATPay burst endpoint.
    try {
      const res = await fetch(`${ALATPAY_URL}/demo/burst`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantAccountId }),
      });
      const data = await res.json();
      setStatus(data.message ?? "Burst started");
    } catch {
      setStatus("Could not reach mock ALATPay. Is it running on :5500?");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={triggerBurst}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        Trigger demo burst
      </Button>
      {status && (
        <p className="max-w-xs text-right text-micro text-ink-tertiary">
          {status}
        </p>
      )}
    </div>
  );
}
