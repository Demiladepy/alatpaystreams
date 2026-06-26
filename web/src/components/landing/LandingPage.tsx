"use client";

import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Nfc,
  Shield,
  Split,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: Mic,
    title: "Streams Voice",
    body: "Set bucket rules in English, Pidgin, or Yoruba. Accept loan offers by voice — no forms.",
  },
  {
    icon: Nfc,
    title: "Tap & Pay routing",
    body: "Every NFC and card payment splits automatically into tax, savings, and supplier buckets.",
  },
  {
    icon: Shield,
    title: "Streams Uptime",
    body: "Predict bank rail availability before disbursements — fewer failed payouts.",
  },
];

const steps = [
  "Payment arrives via card, transfer, or Tap & Pay",
  "Split engine routes to VAT, savings, suppliers",
  "Co-pilot watches sales and offers working capital",
  "Uptime checks bank rails before every payout",
];

const trusted = ["Wema Bank", "ALATPay", "YarnGPT", "WhatsApp Business"];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-ink-primary">
      {/* Announcement strip — Mono-style */}
      <div className="border-b border-border bg-surface/80">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2.5 text-center text-micro text-ink-secondary sm:justify-between sm:text-left">
          <span>
            Built for Wema · ALAT: The Evolution — merchant income routing
          </span>
          <Link
            href="/onboarding"
            className="hidden items-center gap-1 font-medium text-accent hover:text-accent-hover sm:inline-flex"
          >
            Get started
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-ink-primary">
              <Split className="h-4 w-4 text-white" />
            </div>
            <span className="text-body font-medium">ALATPay Streams</span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="secondary" size="sm" asChild className="hidden sm:inline-flex">
              <Link href="/dashboard?demo=1">Live demo</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/onboarding">
                Get started
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero — Mono: headline left, product preview right */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-8 sm:pb-24 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h1 className="text-3xl font-medium tracking-tight text-ink-primary sm:text-4xl lg:text-display lg:leading-[1.05]">
                Programmable income routing for Nigerian SMEs
              </h1>
              <p className="mt-5 max-w-lg text-body text-ink-secondary sm:text-lg">
                Every payment that hits ALATPay splits into tax, savings, suppliers,
                and loan repayment — automatically. Voice-first. Contactless-ready.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" asChild>
                  <Link href="/onboarding">
                    Get started
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="secondary" size="lg" asChild>
                  <Link href="/dashboard?demo=1">See a demo</Link>
                </Button>
              </div>
            </div>

            {/* Product preview card — Mono widget style */}
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              <div className="rounded-lg border border-border bg-surface p-1 shadow-sm">
                <div className="rounded-md border border-border bg-white p-4 sm:p-5">
                  <div className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="text-micro text-ink-tertiary">Funke Adebayo Beauty Ltd</p>
                      <p className="text-lg font-medium tabular">₦145,000</p>
                    </div>
                    <span className="rounded-full bg-success-subtle px-2 py-0.5 text-micro font-medium text-success">
                      Live
                    </span>
                  </div>
                  <div className="mt-4 space-y-2">
                    {[
                      { label: "VAT Reserve", pct: "7.5%", amt: "₦10,875" },
                      { label: "Emergency Savings", pct: "10%", amt: "₦14,500" },
                      { label: "Supplier Payment", pct: "Fixed", amt: "₦5,000" },
                      { label: "Operating", pct: "Remainder", amt: "₦114,625" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-md bg-surface px-3 py-2"
                      >
                        <span className="text-small text-ink-secondary">{row.label}</span>
                        <div className="text-right">
                          <span className="text-micro text-ink-tertiary">{row.pct}</span>
                          <p className="text-small font-medium tabular text-ink-primary">
                            {row.amt}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2">
                    <Mic className="h-4 w-4 shrink-0 text-accent" />
                    <p className="text-mini text-ink-tertiary">
                      &ldquo;Set aside 7.5% for VAT&rdquo; — Streams Voice
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trusted by */}
        <section className="border-y border-border bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
            <p className="mb-4 text-center text-micro font-medium uppercase tracking-wider text-ink-tertiary">
              Built with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {trusted.map((name) => (
                <span
                  key={name}
                  className="text-small font-medium text-ink-quaternary"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Value prop — Mono "Opening Africa's financial system" */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-medium tracking-tight sm:text-3xl">
              The merchant counterpart to ALAT: The Evolution
            </h2>
            <p className="mt-4 text-body text-ink-secondary">
              Wema brought voice banking, Tap and Pay, and uptime prediction to
              consumers. ALATPay Streams extends the same three pillars to merchants —
              so every SME gets the same intelligence their customers already trust.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {pillars.map((p) => (
              <article
                key={p.title}
                className="group rounded-lg border border-border bg-white p-6 transition-shadow hover:shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-surface">
                  <p.icon className="h-5 w-5 text-ink-primary" />
                </div>
                <h3 className="text-lg font-medium">{p.title}</h3>
                <p className="mt-2 text-small leading-relaxed text-ink-secondary">
                  {p.body}
                </p>
                <Link
                  href="/onboarding"
                  className="mt-4 inline-flex items-center gap-1 text-small font-medium text-accent hover:text-accent-hover"
                >
                  Learn more
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-border bg-surface/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-24">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-2xl font-medium tracking-tight">How it works</h2>
              <p className="mt-2 text-small text-ink-tertiary">
                Income lands → rules split → buckets fill → AI acts
              </p>
            </div>
            <ol className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li
                  key={step}
                  className="rounded-lg border border-border bg-white p-5"
                >
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink-primary text-micro font-medium text-white">
                    {i + 1}
                  </span>
                  <p className="mt-3 text-small leading-relaxed text-ink-secondary">
                    {step}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* CTA band — Mono footer CTA style */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <div className="rounded-lg bg-ink-primary px-6 py-12 text-center sm:px-12 sm:py-16">
            <h2 className="text-xl font-medium text-white sm:text-2xl">
              Start building with ALATPay Streams
            </h2>
            <p className="mx-auto mt-3 max-w-md text-small text-white/70">
              Three steps — pick buckets, set rules in plain language, go live.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                size="lg"
                asChild
                className="bg-white text-ink-primary hover:bg-white/90"
              >
                <Link href="/onboarding">
                  Start for free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                variant="secondary"
                size="lg"
                asChild
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
              >
                <Link href="/dashboard?demo=1">See a demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8">
          <p className="text-micro text-ink-quaternary">
            ALATPay Streams · Wema Hackathon 2026
          </p>
          <div className="flex gap-6 text-micro text-ink-tertiary">
            <Link href="/dashboard" className="hover:text-ink-primary">
              Dashboard
            </Link>
            <Link href="/onboarding" className="hover:text-ink-primary">
              Onboarding
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
