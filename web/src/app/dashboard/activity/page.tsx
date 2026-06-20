"use client";

import { formatDate } from "@/lib/format";
import { useTransactions, MERCHANT_ID } from "@/lib/api";
import { Naira } from "@/components/ui/Naira";
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
      <div className="h-64 animate-pulse rounded-md border border-border bg-white" />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Activity</h1>
        <p className="mt-1 text-small text-ink-tertiary">
          Recent transactions and how they were split.
        </p>
      </div>

      <div className="overflow-hidden rounded-md border border-border bg-white">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-6 py-3 text-left text-mini font-medium uppercase tracking-wider text-ink-tertiary">
                Date
              </th>
              <th className="px-6 py-3 text-left text-mini font-medium uppercase tracking-wider text-ink-tertiary">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-mini font-medium uppercase tracking-wider text-ink-tertiary">
                Source
              </th>
              <th className="px-6 py-3 text-left text-mini font-medium uppercase tracking-wider text-ink-tertiary">
                Splits
              </th>
            </tr>
          </thead>
          <tbody>
            {transactions?.map((tx) => {
              const channel = txChannel((tx as { raw?: unknown }).raw);
              const isTap = channel === "tap_and_pay";

              return (
                <tr
                  key={tx.id}
                  className="border-b border-border transition-colors last:border-0 hover:bg-surface"
                >
                  <td className="px-6 py-4 text-small text-ink-secondary">
                    {formatDate(tx.receivedAt)}
                    {tx.externalRef && (
                      <span className="mt-0.5 block text-mini text-ink-tertiary">
                        {tx.externalRef}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Naira amount={tx.amountNaira} size="sm" />
                      {isTap && (
                        <Nfc className="h-3.5 w-3.5 text-ink-tertiary" aria-label="Tap and Pay" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-small capitalize text-ink-secondary">
                    {tx.source.replace("_", " ").toLowerCase()}
                    {isTap && (
                      <span className="ml-2 text-mini text-ink-tertiary">Tap & Pay</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {tx.splits.map((split) => (
                        <span
                          key={split.id}
                          className="inline-flex items-center gap-1.5 text-mini text-ink-secondary"
                        >
                          <span>{split.bucket?.name ?? "Operating"}</span>
                          <Naira amount={split.amountNaira} size="sm" subdued />
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {transactions?.length === 0 && (
          <p className="py-12 text-center text-small text-ink-tertiary">
            No transactions yet. Use Simulate transaction to get started.
          </p>
        )}
      </div>
    </div>
  );
}
