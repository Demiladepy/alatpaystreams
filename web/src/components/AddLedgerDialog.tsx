"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import type { BucketType } from "@/types";
import { BUCKET_OPTIONS } from "@/lib/onboarding";
import { createBucket } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AddLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  merchantId: string;
  nextPriority: number;
}

export function AddLedgerDialog({
  open,
  onOpenChange,
  merchantId,
  nextPriority,
}: AddLedgerDialogProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<BucketType>("CUSTOM");
  const [percentage, setPercentage] = useState("10");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setType("CUSTOM");
    setPercentage("10");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pct = parseFloat(percentage);
    if (!name.trim()) {
      setError("Enter a ledger name.");
      return;
    }
    if (!pct || pct <= 0 || pct > 100) {
      setError("Percentage must be between 0 and 100.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createBucket({
        merchantId,
        name: name.trim(),
        type,
        rule: { kind: "PERCENTAGE", value: pct },
        priority: nextPriority,
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create ledger.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent className="rounded-md border-border">
        <DialogHeader>
          <DialogTitle>Add a ledger</DialogTitle>
          <DialogDescription>
            Create a new sub-account. Percentage splits apply to incoming payments after fixed rules.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ledger-name" className="mb-2 block text-small font-medium text-ink-primary">
              Name
            </label>
            <Input
              id="ledger-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Equipment fund"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="ledger-type" className="mb-2 block text-small font-medium text-ink-primary">
              Type
            </label>
            <select
              id="ledger-type"
              value={type}
              onChange={(e) => setType(e.target.value as BucketType)}
              className="h-10 w-full rounded-md border border-border bg-white px-3 text-small text-ink-primary outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/10"
            >
              {BUCKET_OPTIONS.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="ledger-pct" className="mb-2 block text-small font-medium text-ink-primary">
              Percentage of each payment
            </label>
            <Input
              id="ledger-pct"
              type="number"
              min={0.1}
              max={100}
              step={0.5}
              value={percentage}
              onChange={(e) => setPercentage(e.target.value)}
            />
          </div>

          {error && (
            <p className="rounded-md border border-danger/20 bg-danger-subtle px-3 py-2 text-small text-danger">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating…
              </>
            ) : (
              "Create ledger"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
