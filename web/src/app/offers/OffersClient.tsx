"use client";

import { useEffect, useState } from "react";
import { CreditCard, Clock } from "lucide-react";
import { getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import { Naira } from "@/components/ui/Naira";
import { Pill } from "@/components/ui/Pill";
import { Card, CardBody } from "@/components/ui/Card";

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

function statusPill(status: Loan["status"]) {
  const map = {
    OFFERED: "accent" as const,
    ACTIVE: "success" as const,
    REPAID: "neutral" as const,
    EXPIRED: "neutral" as const,
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
        <h1 className="text-2xl font-semibold text-ink-primary">Loan offers</h1>
        <p className="mt-1 text-small text-ink-tertiary">
          Working-capital offers from your ALATPay sales history.
        </p>
      </div>

      {loading && (
        <div className="h-32 animate-pulse rounded-md border border-border bg-white" />
      )}

      {!loading && loans.length === 0 && (
        <Card>
          <CardBody className="flex flex-col items-center py-16">
            <CreditCard className="mb-4 h-7 w-7 text-ink-quaternary" />
            <p className="text-center text-small text-ink-tertiary">
              No offers yet. Ask the co-pilot about your sales to check eligibility.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="space-y-3">
        {loans.map((loan) => (
          <Card key={loan.id}>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Naira amount={loan.principal} size="lg" />
                  <p className="mt-1 text-small text-ink-tertiary">
                    Fee <Naira amount={loan.feeNaira} size="sm" className="inline" /> · Repay{" "}
                    {loan.repaymentPercentage}% per sale
                  </p>
                </div>
                <Pill variant={statusPill(loan.status)}>{loan.status.toLowerCase()}</Pill>
              </div>
              {loan.status === "ACTIVE" && (
                <p className="mt-3 flex items-center gap-1.5 text-small text-ink-tertiary">
                  <Clock className="h-3.5 w-3.5" />
                  Outstanding: <Naira amount={loan.outstanding} size="sm" className="inline" />
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
