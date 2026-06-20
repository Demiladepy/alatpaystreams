"use client";

import type { OnboardingBucket } from "@/lib/onboarding";
import { getBucketConfig } from "@/lib/buckets";
import { Pill } from "@/components/ui/Pill";

interface StepConfirmProps {
  buckets: OnboardingBucket[];
}

export function StepConfirm({ buckets }: StepConfirmProps) {
  const totalPct = buckets.reduce((s, b) => s + b.percentage, 0);

  return (
    <div className="rounded-md border border-border bg-white p-5 sm:p-8">
      <h2 className="text-xl font-medium text-ink-primary">Confirm your setup</h2>
      <p className="mt-2 text-small text-ink-tertiary">
        Review before going live. You can change rules anytime from the co-pilot.
      </p>

      <ul className="mt-6 space-y-3">
        {buckets.map((bucket) => {
          const config = getBucketConfig(bucket.type);
          const Icon = config.icon;

          return (
            <li
              key={bucket.type}
              className="flex flex-col gap-2 rounded-md border border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-subtle">
                  <Icon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-small font-medium text-ink-primary">{bucket.name}</p>
                  {bucket.naturalLanguage && (
                    <p className="text-mini text-ink-tertiary line-clamp-2">
                      &ldquo;{bucket.naturalLanguage}&rdquo;
                    </p>
                  )}
                </div>
              </div>
              <Pill>{bucket.percentage}% per sale</Pill>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 rounded-md border-2 border-accent/30 bg-accent-subtle/30 px-4 py-3 text-center">
        <p className="text-small text-ink-secondary">
          <span className="font-medium text-ink-primary">{totalPct.toFixed(1)}%</span> routed
          to buckets ·{" "}
          <span className="font-medium text-ink-primary">
            {Math.max(0, 100 - totalPct).toFixed(1)}%
          </span>{" "}
          operating
        </p>
      </div>
    </div>
  );
}
