"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Loader2 } from "lucide-react";
import { useState } from "react";
import type { Merchant } from "@/types";
import { maskAccountId } from "@/lib/format";
import { simulateTransaction, MERCHANT_ID } from "@/lib/api";
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
  const [menuOpen, setMenuOpen] = useState(false);
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
      await simulateTransaction(merchant?.id ?? MERCHANT_ID, parsed);
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
      <header className="sticky top-0 z-40 h-14 border-b border-border bg-white">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="text-body font-medium text-ink-primary">
              ALATPay Streams
            </Link>
            <nav className="hidden items-center gap-1 sm:flex">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-small font-medium transition-colors",
                    pathname === link.href
                      ? "bg-surface text-ink-primary"
                      : "text-ink-tertiary hover:text-ink-secondary",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setSimulateOpen(true)}>
              Simulate transaction
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-small text-ink-secondary hover:bg-surface"
            >
              <span className="max-w-[140px] truncate">
                {merchant?.name ?? "Merchant"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-tertiary" />
            </button>
            {menuOpen && (
              <div className="absolute right-4 top-14 z-50 min-w-[200px] rounded-md border border-border bg-white p-2 shadow-none sm:right-8">
                <p className="px-2 py-1.5 text-mini text-ink-tertiary">
                  {maskAccountId(merchant?.alatpayAccountId)}
                </p>
              </div>
            )}
          </div>
        </div>
      </header>

      <Dialog open={simulateOpen} onOpenChange={setSimulateOpen}>
        <DialogContent className="rounded-md border-border">
          <DialogHeader>
            <DialogTitle>Simulate incoming payment</DialogTitle>
            <DialogDescription>
              Enter an amount to split across your buckets.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSimulate} className="space-y-4">
            <div>
              <label htmlFor="amount" className="mb-2 block text-small font-medium text-ink-primary">
                Amount
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

            {error && <p className="text-small text-danger">{error}</p>}

            <Button type="submit" className="w-full" disabled={submitting}>
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
