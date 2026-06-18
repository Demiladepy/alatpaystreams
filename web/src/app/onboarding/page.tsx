"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StepPickTypes } from "@/components/onboarding/StepPickTypes";
import { StepSetRules } from "@/components/onboarding/StepSetRules";
import { StepConfirm } from "@/components/onboarding/StepConfirm";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const steps = [
  { title: "Pick types", component: StepPickTypes },
  { title: "Set rules", component: StepSetRules },
  { title: "Confirm", component: StepConfirm },
];

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const StepComponent = steps[currentStep].component;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-forest"
        >
          ← Back to dashboard
        </Link>
        <h1 className="mt-4 font-display text-2xl font-semibold text-forest">
          Set up your buckets
        </h1>
        <p className="mt-1 text-muted-foreground">
          Three quick steps to route your income automatically.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-2">
        {steps.map((step, i) => (
          <div key={step.title} className="flex flex-1 items-center gap-2">
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                i <= currentStep
                  ? "bg-forest text-cream"
                  : "bg-cream-dark text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "hidden text-sm sm:inline",
                i <= currentStep ? "text-forest" : "text-muted-foreground",
              )}
            >
              {step.title}
            </span>
            {i < steps.length - 1 && (
              <div
                className={cn(
                  "mx-1 hidden h-px flex-1 sm:block",
                  i < currentStep ? "bg-forest" : "bg-forest/10",
                )}
              />
            )}
          </div>
        ))}
      </div>

      <StepComponent />

      <div className="mt-6 flex justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
          disabled={currentStep === 0}
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </Button>

        {currentStep < steps.length - 1 ? (
          <Button onClick={() => setCurrentStep((s) => s + 1)}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button asChild>
            <Link href="/dashboard">Finish setup</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
