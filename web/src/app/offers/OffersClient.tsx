"use client";

import { useEffect, useState } from "react";
import { CreditCard, Clock } from "lucide-react";
import { formatNaira } from "@/lib/format";
import { getApiBaseUrl, MERCHANT_ID } from "@/lib/api";

interface Loan {
  id: string;
  principal: string;
  feeNaira: string;
  outstanding: string;
  repaymentPercentage: string;
  status: "OFFERED" | "ACTIVE" | "REPAID" | "EXPIRED";
  offeredAt: string;
  acceptedAt: string | null;
}

function statusBadge(status: Loan["status"]) {
  const map = {
    OFFERED: "bg-gold/15 text-gold",
    ACTIVE: "bg-forest/10 text-forest",
    REPAID: "bg-emerald-100 text-emerald-800",
    EXPIRED: "bg-gray-100 text-gray-600",
  };
  return map[status];
}

export default function OffersClient() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = getApiBaseUrl();
    if (!base) {
      setLoading(false);
      return;
    }

    void fetch(`${base}/api/merchants/${MERCHANT_ID}/loans`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setLoans)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-forest">
          Loan offers
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Working-capital offers from your ALATPay sales history.
        </p>
      </div>

      {loading && (
        <div className="h-32 animate-pulse rounded-2xl bg-white/60 shadow-card" />
      )}

      {!loading && loans.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white px-6 py-16 shadow-card">
          <CreditCard className="mb-4 h-7 w-7 text-muted-foreground" />
          <p className="text-center text-muted-foreground">
            No offers yet. Ask the co-pilot about your sales to check eligibility.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {loans.map((loan) => (
          <article key={loan.id} className="rounded-2xl bg-white p-5 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-display text-xl font-semibold text-forest">
                  {formatNaira(loan.principal)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Fee {formatNaira(loan.feeNaira)} · Repay {loan.repaymentPercentage}% per sale
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${statusBadge(loan.status)}`}
              >
                {loan.status.toLowerCase()}
              </span>
            </div>
            {loan.status === "ACTIVE" && (
              <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                Outstanding: {formatNaira(loan.outstanding)}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
