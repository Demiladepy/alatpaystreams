"use client";

import Link from "next/link";
import {
  ArrowRight,
  Mic,
  Nfc,
  Shield,
  Sparkles,
  Split,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const pillars = [
  {
    icon: Mic,
    title: "Streams Voice",
    subtitle: "SAW for merchants",
    body: "Speak in English, Pidgin, or Yoruba to set bucket rules, check sales, and accept loan offers — no forms.",
  },
  {
    icon: Nfc,
    title: "Tap & Pay routing",
    subtitle: "Contactless → buckets",
    body: "Every NFC and card payment splits automatically, the same way Wema routes consumer Tap and Pay.",
  },
  {
    icon: Shield,
    title: "Streams Uptime",
    subtitle: "Predictive rails",
    body: "Know bank availability before loan disbursement and supplier payouts — fewer failed transfers.",
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Purple outline frame — Wema / ALAT pledge */}
      <div className="pointer-events-none fixed inset-3 rounded-lg border-2 border-accent/40 sm:inset-4 md:inset-6" />
      <div className="pointer-events-none fixed inset-3 rounded-lg ring-1 ring-accent/10 sm:inset-4 md:inset-6" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-accent/30 bg-accent-subtle">
            <Split className="h-4 w-4 text-accent" />
          </div>
          <span className="text-body font-medium text-ink-primary">ALATPay Streams</span>
        </div>
        <nav className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/onboarding">
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-4 pb-20 pt-8 sm:px-8 sm:pt-16">
        {/* Hero */}
        <section className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent-subtle px-3 py-1 text-micro font-medium text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            Built for Wema · ALAT: The Evolution
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-ink-primary sm:text-4xl md:text-5xl">
            Programmable income routing for Nigerian SMEs
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-body text-ink-secondary sm:text-lg">
            Every payment that hits ALATPay splits into tax, savings, suppliers, and
            loan repayment — automatically. Voice-first. Contactless-ready.
            Infrastructure-grade.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" asChild>
              <Link href="/onboarding">
                Set up your buckets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/dashboard?demo=1">Watch live demo</Link>
            </Button>
          </div>
        </section>

        {/* Pledge card */}
        <section className="mx-auto mt-16 max-w-4xl">
          <div className="rounded-md border-2 border-accent/50 bg-gradient-to-b from-accent-subtle/80 to-white p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-micro font-medium uppercase tracking-wider text-accent">
                  Our pledge to Wema & ALATPay
                </p>
                <h2 className="mt-2 text-xl font-medium text-ink-primary sm:text-2xl">
                  The merchant counterpart to ALAT: The Evolution
                </h2>
                <p className="mt-3 text-small leading-relaxed text-ink-secondary">
                  Wema brought voice banking, Tap and Pay, and uptime prediction to
                  consumers. ALATPay Streams extends the same three pillars to
                  merchants — so Funke&apos;s kitchen gets the same intelligence her
                  customers already trust.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2 rounded-md border border-accent/30 bg-white px-4 py-3">
                <Zap className="h-5 w-5 text-accent" />
                <div className="text-left">
                  <p className="text-micro font-medium text-ink-primary">Voice · Tap · Uptime</p>
                  <p className="text-micro text-ink-tertiary">Three pillars, one platform</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pillars grid */}
        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <article
              key={p.title}
              className="rounded-md border border-border bg-white p-5 transition-colors hover:border-accent/40 sm:p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-accent/25 bg-accent-subtle">
                <p.icon className="h-5 w-5 text-accent" />
              </div>
              <p className="text-micro font-medium uppercase tracking-wider text-accent">
                {p.subtitle}
              </p>
              <h3 className="mt-1 text-lg font-medium text-ink-primary">{p.title}</h3>
              <p className="mt-2 text-small leading-relaxed text-ink-secondary">{p.body}</p>
            </article>
          ))}
        </section>

        {/* How it works */}
        <section className="mt-20 text-center">
          <h2 className="text-2xl font-medium text-ink-primary">How it works</h2>
          <p className="mx-auto mt-2 max-w-xl text-small text-ink-tertiary">
            Income lands → rules split → buckets fill → AI acts
          </p>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {[
              "Payment arrives via card, transfer, or Tap & Pay",
              "Split engine routes to VAT, savings, suppliers",
              "Co-pilot watches sales and offers working capital",
              "Uptime checks bank rails before every payout",
            ].map((step, i) => (
              <li
                key={step}
                className="rounded-md border border-border bg-surface px-4 py-4"
              >
                <span className="text-micro font-medium text-accent">{i + 1}</span>
                <p className="mt-1 text-small text-ink-secondary">{step}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-2xl rounded-md border-2 border-accent/40 bg-white p-8 text-center sm:p-10">
          <h2 className="text-xl font-medium text-ink-primary sm:text-2xl">
            Ready to route your first payment?
          </h2>
          <p className="mt-2 text-small text-ink-tertiary">
            Three steps — pick buckets, set rules in plain language, go live.
          </p>
          <Button className="mt-6" size="lg" asChild>
            <Link href="/onboarding">
              Start onboarding
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border py-6 text-center text-micro text-ink-quaternary">
        ALATPay Streams · Wema Hackathon 2026 · Programmable income for Nigerian SMEs
      </footer>
    </div>
  );
}
