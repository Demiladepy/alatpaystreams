"use client";

import { CreditCard, Clock } from "lucide-react";
import { getApiBaseUrl, isMockMode, MERCHANT_ID, useLoans } from "@/lib/api";
import { Naira } from "@/components/ui/Naira";
import { Pill } from "@/components/ui/Pill";
import { Card, CardBody } from "@/components/ui/Card";

function statusPill(status: "OFFERED" | "ACTIVE" | "REPAID" | "EXPIRED") {
  const map = {
    OFFERED: "accent" as const,
    ACTIVE: "success" as const,
    REPAID: "neutral" as const,
    EXPIRED: "neutral" as const,
  };
  return map[status];
}

export default function OffersClient() {
  const { data: loans = [], isLoading } = useLoans(MERCHANT_ID);
  const apiConfigured = Boolean(getApiBaseUrl());
  const apiUnreachable = apiConfigured && isMockMode() && !isLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-primary">Loan offers</h1>
        <p className="mt-1 text-small text-ink-tertiary">
          Working-capital offers from your ALATPay sales history.
        </p>
      </div>

      {apiUnreachable && (
        <div className="rounded-md border border-warning/30 bg-warning-subtle px-4 py-3 text-small text-ink-secondary">
          Backend unavailable, start the API on port 3000 to load live offers.
        </div>
      )}

      {isLoading && (
        <div className="h-32 animate-pulse rounded-md border border-border bg-white" />
      )}

      {!isLoading && loans.length === 0 && (
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
