"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2 } from "lucide-react";
import { createBucket, MERCHANT_ID } from "@/lib/api";
import { StepPickTypes } from "@/components/onboarding/StepPickTypes";
import { StepSetRules } from "@/components/onboarding/StepSetRules";
import { StepConfirm } from "@/components/onboarding/StepConfirm";
import { Button } from "@/components/ui/button";
import {
  defaultBucketName,
  type OnboardingBucket,
} from "@/lib/onboarding";
import type { BucketType } from "@/types";
import { cn } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedTypes, setSelectedTypes] = useState<BucketType[]>([]);
  const [buckets, setBuckets] = useState<OnboardingBucket[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const toggleType = useCallback((type: BucketType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }, []);

  const syncBucketsFromSelection = useCallback(() => {
    setBuckets((prev) => {
      const next: OnboardingBucket[] = selectedTypes.map((type) => {
        const existing = prev.find((b) => b.type === type);
        if (existing) return existing;
        return {
          type,
          name: defaultBucketName(type),
          percentage: 0,
          naturalLanguage: "",
        };
      });
      return next;
    });
  }, [selectedTypes]);

  const updateBucket = useCallback(
    (type: BucketType, patch: Partial<OnboardingBucket>) => {
      setBuckets((prev) =>
        prev.map((b) => (b.type === type ? { ...b, ...patch } : b)),
      );
    },
    [],
  );

  const totalPct = useMemo(
    () => buckets.reduce((s, b) => s + b.percentage, 0),
    [buckets],
  );

  const canProceed =
    currentStep === 0
      ? selectedTypes.length > 0
      : currentStep === 1
        ? buckets.length > 0 && totalPct <= 100 && totalPct > 0
        : true;

  function goNext() {
    if (currentStep === 0) syncBucketsFromSelection();
    setCurrentStep((s) => Math.min(2, s + 1));
  }

  async function finishSetup() {
    setSaving(true);
    setSaveError(null);

    try {
      for (let i = 0; i < buckets.length; i++) {
        const bucket = buckets[i];
        await createBucket({
          merchantId: MERCHANT_ID,
          name: bucket.name.trim(),
          type: bucket.type,
          rule: { kind: "PERCENTAGE", value: bucket.percentage },
          priority: 100 + i,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save ledgers.");
    } finally {
      setSaving(false);
    }
  }

  const steps = [
    { title: "Pick types", short: "Types" },
    { title: "Set rules", short: "Rules" },
    { title: "Confirm", short: "Confirm" },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <Link
          href="/"
          className="text-small text-ink-tertiary hover:text-ink-secondary"
        >
          ← Back to home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold text-ink-primary">
          Set up your ledgers
        </h1>
        <p className="mt-1 text-small text-ink-tertiary">
          Three quick steps to route your income automatically.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-1 sm:gap-2">
        {steps.map((step, i) => (
          <div key={step.title} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-mini font-medium transition-colors",
                i <= currentStep
                  ? "bg-accent text-white"
                  : "border border-border bg-surface text-ink-tertiary",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "hidden text-small sm:inline",
                i <= currentStep ? "text-ink-primary" : "text-ink-tertiary",
              )}
            >
              {step.title}
            </span>
            <span
              className={cn(
                "text-micro sm:hidden",
                i <= currentStep ? "text-ink-primary" : "text-ink-tertiary",
              )}
            >
              {step.short}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-0.5 hidden h-px flex-1 sm:mx-1 sm:block",
                  i < currentStep ? "bg-accent/40" : "bg-border",
                )}
              />
            )}
          </div>
        ))}
      </div>

      {currentStep === 0 && (
        <StepPickTypes selected={selectedTypes} onToggle={toggleType} />
      )}
      {currentStep === 1 && (
        <StepSetRules buckets={buckets} onUpdate={updateBucket} />
      )}
      {currentStep === 2 && <StepConfirm buckets={buckets} />}

      {saveError && (
        <p className="mt-4 rounded-md border border-danger/20 bg-danger-subtle px-4 py-3 text-small text-danger">
          {saveError}
        </p>
      )}

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <Button
          variant="secondary"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
          className="w-full sm:w-auto"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button onClick={goNext} disabled={!canProceed} className="w-full sm:w-auto">
            Next
          </Button>
        ) : (
          <Button
            onClick={() => void finishSetup()}
            disabled={saving || buckets.length === 0}
            className="w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving ledgers…
              </>
            ) : (
              "Finish setup"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
