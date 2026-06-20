"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import type { BucketWithActivity } from "@/types";
import { BucketCard } from "./BucketCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

interface BucketGridProps {
  buckets: BucketWithActivity[];
  isLoading?: boolean;
}

export function BucketGrid({ buckets, isLoading }: BucketGridProps) {
  const [addOpen, setAddOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-44 animate-pulse rounded-md border border-border bg-white"
          />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {buckets.map((bucket) => (
          <BucketCard
            key={bucket.id}
            name={bucket.name}
            balance={bucket.balance}
            rule={bucket.rule}
            recentActivity={bucket.recentActivity}
          />
        ))}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex min-h-[11rem] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-white p-6 text-ink-tertiary transition-colors hover:border-border-strong hover:bg-surface hover:text-ink-secondary"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface">
            <Plus className="h-5 w-5" />
          </div>
          <span className="text-small font-medium">Add bucket</span>
        </button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="rounded-md border-border">
          <DialogHeader>
            <DialogTitle>Add a bucket</DialogTitle>
            <DialogDescription>
              Bucket creation will be available after onboarding.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
