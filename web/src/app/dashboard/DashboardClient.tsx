"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Settings } from "lucide-react";
import { BucketGrid } from "@/components/BucketGrid";
import { SplitFlow } from "@/components/SplitFlow";
import { DemoBurstButton } from "@/components/DemoBurstButton";
import { MockModeBanner } from "@/components/MockModeBanner";
import { UptimePredictor } from "@/components/UptimePredictor";
import { useBuckets, getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import { Naira } from "@/components/ui/Naira";
import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/Pill";

export default function DashboardClient() {
  const searchParams = useSearchParams();
  const isDemo = searchParams.get("demo") === "1";
  const { data: buckets, isLoading } = useBuckets(MERCHANT_ID);

  const totalBalance = buckets?.reduce(
    (sum, b) => sum + parseFloat(b.balance),
    0,
  );

  return (
    <div className="space-y-8">
      <MockModeBanner />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-small text-ink-tertiary">Total across buckets</p>
          <div className="mt-1">
            {totalBalance !== undefined ? (
              <Naira amount={totalBalance} size="xl" />
            ) : (
              <span className="text-2xl text-ink-quaternary">—</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!getApiBaseUrl() && <Pill variant="warning">Mock mode</Pill>}
          {isDemo && <DemoBurstButton />}
          <Button variant="secondary" asChild>
            <Link href="/onboarding">
              <Settings className="h-4 w-4" />
              Configure buckets
            </Link>
          </Button>
        </div>
      </div>

      <SplitFlow merchantId={MERCHANT_ID} buckets={buckets ?? []} />

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-ink-primary">Your buckets</h2>
          <Link
            href="/dashboard/activity"
            className="inline-flex items-center gap-1 text-small text-ink-tertiary hover:text-ink-secondary"
          >
            View activity
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <BucketGrid buckets={buckets ?? []} isLoading={isLoading} />
      </section>

      <UptimePredictor />
    </div>
  );
}
