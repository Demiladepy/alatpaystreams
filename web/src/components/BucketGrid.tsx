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
            className="h-52 animate-pulse rounded-2xl bg-white/60 shadow-card"
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
            type={bucket.type}
            balance={bucket.balance}
            rule={bucket.rule}
            recentActivity={bucket.recentActivity}
          />
        ))}

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex min-h-[13rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-forest/10 bg-white/50 p-5 text-muted-foreground shadow-card transition-all hover:border-gold/40 hover:bg-white hover:text-forest hover:shadow-card-hover"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cream-dark">
            <Plus className="h-6 w-6" />
          </div>
          <span className="text-sm font-medium">Add bucket</span>
        </button>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a bucket</DialogTitle>
            <DialogDescription>
              Bucket creation will be available after onboarding. This modal is
              a placeholder for now.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
