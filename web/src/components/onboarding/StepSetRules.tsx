"use client";

import type { OnboardingBucket } from "@/lib/onboarding";
import { parseRuleFromText } from "@/lib/onboarding";
import { getBucketConfig } from "@/lib/buckets";
import { cn } from "@/lib/utils";

interface StepSetRulesProps {
  buckets: OnboardingBucket[];
  onUpdate: (type: OnboardingBucket["type"], patch: Partial<OnboardingBucket>) => void;
}

export function StepSetRules({ buckets = [], onUpdate }: StepSetRulesProps) {
  const totalPct = buckets.reduce((s, b) => s + b.percentage, 0);

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-white p-5 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-ink-primary">Set your rules</h2>
            <p className="mt-2 text-small text-ink-tertiary">
              Define split rules for each sub-account ledger. Enter percentage limits or write a plain text description of the rule.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-accent/25 bg-accent-subtle/40 px-3 py-2 text-mini text-ink-secondary">
          Try: &ldquo;Keep 15% for capital reserves&rdquo; or &ldquo;Split 7.5% to tax settled&rdquo;
        </div>
      </div>

      {buckets.map((bucket) => {
        const config = getBucketConfig(bucket.type);
        const Icon = config.icon;

        return (
          <div
            key={bucket.type}
            className="rounded-md border border-border bg-white p-4 sm:p-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-accent/25 bg-accent-subtle">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={bucket.name}
                  onChange={(e) => onUpdate(bucket.type, { name: e.target.value })}
                  className="w-full bg-transparent text-small font-medium text-ink-primary outline-none"
                />
                <p className="text-micro text-ink-tertiary">{config.label} ledger</p>
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={bucket.percentage || ""}
                  onChange={(e) =>
                    onUpdate(bucket.type, {
                      percentage: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-16 rounded-md border border-border bg-surface px-2 py-1.5 text-right text-small tabular text-ink-primary outline-none focus:border-accent/40"
                />
                <span className="text-small text-ink-tertiary">%</span>
              </div>
            </div>

            <div className="mt-4 rounded-md border border-border transition-colors focus-within:border-accent/40">
              <textarea
                value={bucket.naturalLanguage}
                onChange={(e) => {
                  const text = e.target.value;
                  const parsed = parseRuleFromText(text);
                  onUpdate(bucket.type, {
                    naturalLanguage: text,
                    ...(parsed !== null ? { percentage: parsed } : {}),
                  });
                }}
                placeholder="Describe this rule in plain text description..."
                rows={2}
                className="block w-full resize-none bg-transparent px-3 py-2.5 text-small text-ink-primary placeholder:text-ink-quaternary focus:outline-none"
              />
            </div>
          </div>
        );
      })}

      <div
        className={cn(
          "rounded-md border px-4 py-3 text-small",
          totalPct > 100
            ? "border-danger/30 bg-danger-subtle text-danger"
            : "border-border bg-surface text-ink-secondary",
        )}
      >
        Total allocation: <span className="tabular font-medium">{totalPct.toFixed(1)}%</span>
        {totalPct > 100 && " (must be 100% or less)"}
        {totalPct <= 100 && totalPct > 0 && " (remainder stays in primary operating ledger)"}
      </div>
    </div>
  );
}
