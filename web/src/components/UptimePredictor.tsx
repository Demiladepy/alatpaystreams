"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity } from "lucide-react";
import { getApiBaseUrl } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface BankHealth {
  bankCode: string;
  bankName: string;
  recentSuccessRate: number;
  avgSettlementMs: number;
  status: "healthy" | "degraded" | "offline";
  prediction: { expectedSettlementSeconds: number; advisory: string };
}

function statusStyles(status: BankHealth["status"]) {
  if (status === "healthy") return "bg-emerald-100 text-emerald-800";
  if (status === "degraded") return "bg-amber-100 text-amber-900";
  return "bg-red-100 text-red-800";
}

export function UptimePredictor() {
  const [banks, setBanks] = useState<BankHealth[]>([]);
  const [selected, setSelected] = useState<BankHealth | null>(null);
  const [history, setHistory] = useState<Array<{ hour: string; successRate: number }>>(
    [],
  );

  useEffect(() => {
    const base = getApiBaseUrl();
    if (!base) return;

    const load = async () => {
      try {
        const res = await fetch(`${base}/api/uptime`);
        if (res.ok) setBanks(await res.json());
      } catch {
        // ignore
      }
    };

    void load();
    const id = setInterval(load, 10_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!selected) return;
    const base = getApiBaseUrl();
    if (!base) return;

    void fetch(`${base}/api/uptime/${selected.bankCode}/history`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setHistory);
  }, [selected]);

  if (!getApiBaseUrl() || banks.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-forest" />
        <h2 className="font-display text-lg font-semibold text-forest">
          Streams Uptime — Bank Availability
        </h2>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {banks.map((bank) => (
          <button
            key={bank.bankCode}
            type="button"
            onClick={() => setSelected(bank)}
            className="rounded-2xl bg-white p-4 text-left shadow-card transition-shadow hover:shadow-card-hover"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-forest">{bank.bankName}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyles(bank.status)}`}
              >
                {bank.status}
              </span>
            </div>
            <p className="mt-2 font-display text-lg font-semibold text-forest">
              {(bank.recentSuccessRate * 100).toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">
              avg {(bank.avgSettlementMs / 1000).toFixed(1)}s settlement
            </p>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected?.bankName} — 24h success rate</DialogTitle>
          </DialogHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <XAxis dataKey="hour" hide />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                <Area
                  type="monotone"
                  dataKey="successRate"
                  stroke="#0F3D2E"
                  fill="#D4A24C33"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {selected && (
            <p className="text-sm text-muted-foreground">{selected.prediction.advisory}</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
