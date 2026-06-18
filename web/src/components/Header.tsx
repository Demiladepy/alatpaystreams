"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import type { Merchant } from "@/types";
import { maskAccountId } from "@/lib/format";
import { simulateTransaction, MOCK_MERCHANT_ID } from "@/lib/api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { cn } from "@/lib/utils";

interface HeaderProps {
  merchant?: Merchant;
}

const navLinks = [
  { href: "/dashboard", label: "Buckets" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/offers", label: "Offers" },
];

export function Header({ merchant }: HeaderProps) {
  const pathname = usePathname();
  const [simulateOpen, setSimulateOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSimulate(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount.replace(/,/g, ""));
    if (!parsed || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await simulateTransaction(
        merchant?.id ?? MOCK_MERCHANT_ID,
        parsed,
      );
      setSimulateOpen(false);
      setAmount("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-forest/5 bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              ALATPay Streams
            </p>
            <h1 className="truncate font-display text-xl font-semibold text-forest">
              {merchant?.name ?? "Loading…"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {maskAccountId(merchant?.alatpayAccountId)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <nav className="flex gap-1 rounded-xl bg-white/60 p-1 shadow-card">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                    pathname === link.href
                      ? "bg-forest text-cream"
                      : "text-muted-foreground hover:text-forest",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <Button
              variant="accent"
              size="default"
              className="w-full sm:w-auto"
              onClick={() => setSimulateOpen(true)}
            >
              <Sparkles className="h-4 w-4" />
              Simulate transaction
            </Button>
          </div>
        </div>
      </header>

      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Simulate incoming payment</DialogTitle>
            <DialogDescription>
              Enter an amount to split across your buckets — the demo trigger.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label
                htmlFor="amount"
                className="mb-2 block text-sm font-medium text-forest"
              >
                Amount (₦)
              </label>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="50,000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            {error && (
              <p className="text-sm text-warning">{error}</p>
            )}

            <Button
              type="submit"
              variant="default"
              className="w-full"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Splitting…
                </>
              ) : (
                "Split payment"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
