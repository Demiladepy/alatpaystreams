"use client";



import Link from "next/link";

import { useSearchParams } from "next/navigation";

import { ArrowRight, Settings } from "lucide-react";

import { BucketGrid } from "@/components/BucketGrid";

import { SplitFlow } from "@/components/SplitFlow";

import { DemoBurstButton } from "@/components/DemoBurstButton";
import { ChatPanel } from "@/components/ChatPanel";
import { MockModeBanner } from "@/components/MockModeBanner";
import { UptimePredictor } from "@/components/UptimePredictor";

import { useBuckets, getApiBaseUrl, MERCHANT_ID } from "@/lib/api";
import { formatNaira } from "@/lib/format";



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

          <p className="text-sm text-muted-foreground">Total across buckets</p>

          <p className="font-display text-3xl font-semibold tracking-tight text-forest sm:text-4xl">

            {totalBalance !== undefined

              ? formatNaira(totalBalance)

              : "—"}

          </p>

        </div>



        <div className="flex flex-wrap items-start gap-2">

          {!getApiBaseUrl() && (

            <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">

              Mock mode

            </span>

          )}

          {isDemo && <DemoBurstButton />}

          <Link

            href="/onboarding"

            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-forest shadow-card transition-shadow hover:shadow-card-hover"

          >

            <Settings className="h-4 w-4" />

            Configure buckets

          </Link>

        </div>

      </div>



      <SplitFlow merchantId={MERCHANT_ID} buckets={buckets ?? []} />

      <ChatPanel merchantId={MERCHANT_ID} />

      <section>

        <div className="mb-4 flex items-center justify-between">

          <h2 className="font-display text-lg font-semibold text-forest">

            Your buckets

          </h2>

          <Link

            href="/dashboard/activity"

            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-forest"

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


