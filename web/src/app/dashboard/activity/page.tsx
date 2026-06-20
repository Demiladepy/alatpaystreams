"use client";

import { formatDate, formatNaira } from "@/lib/format";
import { getBucketConfig } from "@/lib/buckets";
import { useTransactions, MERCHANT_ID } from "@/lib/api";
import { Nfc } from "lucide-react";

function txChannel(raw: unknown): string | null {
  if (raw && typeof raw === "object" && "channel" in raw) {
    return String((raw as { channel: string }).channel);
  }
  return null;
}

export default function ActivityPage() {
  const { data: transactions, isLoading } = useTransactions(MERCHANT_ID);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse rounded-2xl bg-white/60 shadow-card"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          Activity
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent transactions and how they were split.
        </p>
      </div>

      <div className="space-y-3">
        {transactions?.map((tx) => {
          const channel = txChannel((tx as { raw?: unknown }).raw);
          const isTap = channel === "tap_and_pay";

          return (
            <article
              key={tx.id}
              className="rounded-2xl bg-white p-5 shadow-card"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-semibold text-forest">
                      {formatNaira(tx.amountNaira)}
                    </p>
                    {isTap && (
                      <Nfc className="h-4 w-4 text-gold" aria-label="Tap and Pay" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(tx.receivedAt)}
                    {tx.externalRef && ` · ${tx.externalRef}`}
                    {isTap && " · Tap & Pay"}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-cream-dark px-2.5 py-1 text-xs font-medium text-muted-foreground">
                  {tx.source.replace("_", " ").toLowerCase()}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {tx.splits.map((split) => {
                  const bucketType = split.bucket?.type;
                  const config = bucketType ? getBucketConfig(bucketType) : null;
                  const label = split.bucket?.name ?? "Operating";

                  return (
                    <div
                      key={split.id}
                      className="flex items-center gap-2 rounded-xl px-3 py-2"
                      style={{
                        backgroundColor: config
                          ? `${config.accent}12`
                          : "rgba(15,61,46,0.06)",
                      }}
                    >
                      <span className="text-xs font-medium text-forest">{label}</span>
                      <span
                        className="font-display text-sm font-semibold"
                        style={{ color: config?.accent ?? "#0F3D2E" }}
                      >
                        {formatNaira(split.amountNaira)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </article>
          );
        })}

        {transactions?.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No transactions yet. Use &ldquo;Simulate transaction&rdquo; to get started.
          </p>
        )}
      </div>
    </div>
  );
}
