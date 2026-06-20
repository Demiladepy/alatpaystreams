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
import { getApiBaseUrl } from "@/lib/api";
import { StatusDot } from "@/components/ui/StatusDot";
import { Card, CardBody } from "@/components/ui/Card";
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

function statusVariant(status: BankHealth["status"]) {
  if (status === "healthy") return "success" as const;
  if (status === "degraded") return "warning" as const;
  return "danger" as const;
}

function statusLabel(status: BankHealth["status"]) {
  if (status === "healthy") return "Healthy";
  if (status === "degraded") return "Degraded";
  return "Offline";
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
      <div>
        <h2 className="text-lg font-medium text-ink-primary">Streams Uptime</h2>
        <p className="text-small text-ink-tertiary">Bank availability for payouts</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {banks.map((bank) => (
          <button
            key={bank.bankCode}
            type="button"
            onClick={() => setSelected(bank)}
            className="text-left transition-colors"
          >
            <Card className="hover:border-border-strong">
              <CardBody className="py-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-small font-medium text-ink-primary">{bank.bankName}</p>
                  <StatusDot
                    label={statusLabel(bank.status)}
                    variant={statusVariant(bank.status)}
                  />
                </div>
                <p className="mt-3 tabular text-xl font-medium text-ink-primary">
                  {(bank.recentSuccessRate * 100).toFixed(1)}%
                </p>
                <p className="text-mini text-ink-tertiary">
                  avg {(bank.avgSettlementMs / 1000).toFixed(1)}s settlement
                </p>
              </CardBody>
            </Card>
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="rounded-md border-border">
          <DialogHeader>
            <DialogTitle>{selected?.bankName} — 24h success rate</DialogTitle>
          </DialogHeader>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <XAxis dataKey="hour" hide />
                <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                <Tooltip formatter={(v) => `${(Number(v) * 100).toFixed(1)}%`} />
                <Area
                  type="monotone"
                  dataKey="successRate"
                  stroke="#635BFF"
                  fill="#635BFF22"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {selected && (
            <p className="text-small text-ink-tertiary">{selected.prediction.advisory}</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
