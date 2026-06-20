"use client";

import { Check } from "lucide-react";
import type { BucketType } from "@/types";
import { BUCKET_OPTIONS } from "@/lib/onboarding";
import { getBucketConfig } from "@/lib/buckets";
import { cn } from "@/lib/utils";

interface StepPickTypesProps {
  selected: BucketType[];
  onToggle: (type: BucketType) => void;
}

export function StepPickTypes({ selected = [], onToggle }: StepPickTypesProps) {
  return (
    <div className="rounded-md border border-border bg-white p-5 sm:p-8">
      <h2 className="text-xl font-medium text-ink-primary">Pick bucket types</h2>
      <p className="mt-2 text-small text-ink-tertiary">
        Tap to select the pots you want. You can pick more than one — most merchants
        start with Tax, Savings, and Operating.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BUCKET_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.type);
          const config = getBucketConfig(option.type);
          const Icon = config.icon;

          return (
            <button
              key={option.type}
              type="button"
              onClick={() => onToggle(option.type)}
              className={cn(
                "relative flex flex-col rounded-md border-2 p-4 text-left transition-all",
                isSelected
                  ? "border-accent bg-accent-subtle/50 ring-1 ring-accent/20"
                  : "border-border bg-white hover:border-accent/40 hover:bg-surface",
              )}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <div
                className={cn(
                  "mb-3 flex h-10 w-10 items-center justify-center rounded-md border",
                  isSelected ? "border-accent/30 bg-white" : "border-border bg-surface",
                )}
              >
                <Icon className="h-5 w-5 text-accent" />
              </div>
              <span className="text-small font-medium text-ink-primary">{option.label}</span>
              <span className="text-micro text-accent">{option.labelLocal}</span>
              <span className="mt-2 text-mini leading-relaxed text-ink-tertiary">
                {option.description}
              </span>
            </button>
          );
        })}
      </div>

      {selected.length > 0 && (
        <p className="mt-4 text-mini text-ink-secondary">
          {selected.length} bucket{selected.length === 1 ? "" : "s"} selected
        </p>
      )}
    </div>
  );
}
