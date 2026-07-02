"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  Terminal,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevolutHero } from "./RevolutHero";

interface SplitRule {
  supplierFixed: number;
  vatPercent: number;
  savingsPercent: number;
  salaryPercent: number;
}

const payments = [
  { amt: 50000, src: "POS · Terminal 004" },
  { amt: 23500, src: "Transfer · GTBank" },
  { amt: 120000, src: "Invoice · Acme Foods" },
  { amt: 8200, src: "QR · Walk-in" },
  { amt: 64750, src: "Transfer · Kuda" },
];

const bankData = [
  { name: "Wema / ALAT", pct: 99.98, code: "035" },
  { name: "OPay", pct: 99.5, code: "999" },
  { name: "GTBank", pct: 99.2, code: "058" },
  { name: "Moniepoint", pct: 99.1, code: "505" },
  { name: "Zenith", pct: 98.9, code: "057" },
  { name: "Kuda", pct: 98.2, code: "090" },
  { name: "Access", pct: 97.8, code: "044" },
  { name: "Stanbic", pct: 97.2, code: "039" },
  { name: "UBA", pct: 96.4, code: "033" },
  { name: "Fidelity", pct: 95.7, code: "070" },
  { name: "First Bank", pct: 94.1, code: "011" },
  { name: "Sterling", pct: 93.8, code: "030" },
];

/* Revolut-style rise-on-scroll reveal */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > window.innerHeight * 0.55);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Simulator State
  const [run, setRun] = useState(0);
  const [showPulses, setShowPulses] = useState(false);
  const [payment, setPayment] = useState({ amt: 50000, src: "POS · Terminal 004" });
  const [balances, setBalances] = useState({
    supplier: 184000,
    vat: 412350,
    savings: 618525,
    salary: 824700,
    operating: 1276400,
  });
  const [deltas, setDeltas] = useState<Record<string, number> | null>(null);
  const [txCount, setTxCount] = useState(1284);
  const [isLive, setIsLive] = useState(true);

  // Playground Config State
  const [customAmount, setCustomAmount] = useState("75000");
  const [rules, setRules] = useState<SplitRule>({
    supplierFixed: 8000,
    vatPercent: 10,
    savingsPercent: 15,
    salaryPercent: 20,
  });



  // Ref loops for simulator
  const t1 = useRef<NodeJS.Timeout | null>(null);
  const t2 = useRef<NodeJS.Timeout | null>(null);
  const t3 = useRef<NodeJS.Timeout | null>(null);

  // Logic to execute split
  const calculateSplit = (amount: number, currentRules: SplitRule) => {
    const supplier = Math.min(currentRules.supplierFixed, amount);
    const r = amount - supplier;
    const vat = r * (currentRules.vatPercent / 100);
    const savings = r * (currentRules.savingsPercent / 100);
    const salary = r * (currentRules.salaryPercent / 100);
    const operating = r - vat - savings - salary;
    return { supplier, vat, savings, salary, operating };
  };

  const triggerSimulationPayment = useCallback((customAmt?: number) => {
    const p = customAmt
      ? { amt: customAmt, src: "Playground Simulator" }
      : payments[run % payments.length];

    setPayment(p);
    setShowPulses(true);
    setDeltas(null);

    if (t2.current) clearTimeout(t2.current);
    t2.current = setTimeout(() => {
      const d = calculateSplit(p.amt, rules);
      setDeltas(d);
      setBalances((prev) => ({
        supplier: prev.supplier + d.supplier,
        vat: prev.vat + d.vat,
        savings: prev.savings + d.savings,
        salary: prev.salary + d.salary,
        operating: prev.operating + d.operating,
      }));
      setTxCount((c) => c + 1);
      setShowPulses(false);

      if (t3.current) clearTimeout(t3.current);
      t3.current = setTimeout(() => {
        setDeltas(null);
        if (!customAmt) {
          setRun((r) => r + 1);
        }
      }, 2400);
    }, 1200);
  }, [run, rules]);

  useEffect(() => {
    if (!isLive) return;
    if (t1.current) clearTimeout(t1.current);
    t1.current = setTimeout(() => {
      triggerSimulationPayment();
    }, 5000);
    return () => {
      if (t1.current) clearTimeout(t1.current);
      if (t2.current) clearTimeout(t2.current);
      if (t3.current) clearTimeout(t3.current);
    };
  }, [run, isLive, triggerSimulationPayment]);

  const handleSimulatePlayground = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(customAmount);
    if (isNaN(amt) || amt <= 0) return;
    setIsLive(false);
    triggerSimulationPayment(amt);
  };

  const fmt = (n: number) => "₦" + Math.round(n).toLocaleString("en-US");

  const bucketMeta = [
    { k: "supplier", badge: "FIXED · P1", name: "Accounts Payable", desc: `₦${rules.supplierFixed.toLocaleString()} first` },
    { k: "vat", badge: "TAX", name: "Tax Settlement", desc: `${rules.vatPercent}% of remainder` },
    { k: "savings", badge: "SAVINGS", name: "Capital Reserve", desc: `${rules.savingsPercent}% of remainder` },
    { k: "salary", badge: "SALARY", name: "Payroll Allocation", desc: `${rules.salaryPercent}% of remainder` },
    { k: "operating", badge: "REMAINDER", name: "Operating Float", desc: "whatever is left" },
  ];

  const splitResultPreview = calculateSplit(parseFloat(customAmount) || 50000, rules);

  return (
    <div className="min-h-screen bg-[#FAFAFB] text-zinc-900 font-sans antialiased overflow-x-clip relative">

      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled 
          ? "border-b border-zinc-200/40 bg-white" 
          : "border-b border-transparent bg-transparent"
      }`}>
        <div className="flex items-center justify-between max-w-[1180px] mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-[26px] h-[26px] rounded-[7px] bg-blue-600 flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c5 0 5-7 10-7s5 7 10 7" />
                <path d="M2 12c5 0 5 7 10 7s5-7 10-7" />
              </svg>
            </div>
            <span className={`font-semibold text-[17px] tracking-tight transition-colors duration-300 ${
              scrolled ? "text-zinc-950" : "text-white"
            }`}>
              ALATPay <span className={scrolled ? "text-blue-600" : "text-blue-400 font-semibold"}>Streams</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" asChild className={`hidden sm:inline-flex active:scale-[0.98] transition-all duration-200 ${
              scrolled ? "text-blue-600 hover:bg-blue-50" : "text-white hover:bg-white/10"
            }`}>
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" asChild className={`font-semibold rounded-full px-5 active:scale-[0.98] transition-all duration-300 ${
              scrolled
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-white hover:bg-zinc-100 text-zinc-950"
            }`}>
              <Link href="/onboarding">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Revolut "Zoom Out to Track" hero — massive card scales down into a horizontal track */}
      <RevolutHero
        operatingFloat={fmt(balances.operating)}
        delta={deltas ? fmt(deltas.operating) : null}
      />

      {/* Trusted by */}
      <section className="relative z-10 py-10">
        <Reveal className="mx-auto max-w-6xl px-6">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-3">
            <span className="font-mono text-micro font-medium uppercase tracking-[0.14em] text-zinc-400 mr-4">
              Built with
            </span>
            {["Wema Bank", "ALATPay", "YarnGPT", "WhatsApp Business"].map((name) => (
              <span
                key={name}
                className="text-[13px] font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-default px-3"
              >
                {name}
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      {/* Interactive Live Split Engine console */}
      <section className="relative z-10 max-w-[1104px] mx-auto px-6 pb-24">
        <Reveal>
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 sm:p-8 shadow-[0_1px_2px_rgba(9,9,11,0.04),0_24px_48px_-20px_rgba(9,9,11,0.12)]">

            <div className="flex flex-wrap items-center justify-between gap-y-2 pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2 font-mono text-micro text-zinc-400 uppercase tracking-[0.12em]">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping [animation-duration:2s]"></span>
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                </span>
                Split engine · {isLive ? "live simulator" : "paused for playground"}
              </div>
              <div className="flex items-center gap-4 font-mono text-micro text-zinc-400">
                {isLive ? (
                  <button
                    onClick={() => setIsLive(false)}
                    className="text-zinc-500 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    [pause]
                  </button>
                ) : (
                  <button
                    onClick={() => setIsLive(true)}
                    className="text-emerald-600 hover:text-emerald-500 transition-colors cursor-pointer"
                  >
                    [resume]
                  </button>
                )}
                <span>tx routed today · <span className="text-zinc-900 font-medium">{txCount.toLocaleString()}</span></span>
              </div>
            </div>

            <div className="flex justify-center pt-8">
              <div className="inline-flex items-center gap-4 bg-zinc-50 border border-zinc-200/80 rounded-xl px-5 py-3 shadow-[0_1px_2px_rgba(9,9,11,0.03)]">
                <span className="font-mono text-micro text-zinc-400 uppercase tracking-[0.14em]">Incoming</span>
                <span className="font-mono text-xl font-semibold text-zinc-950 tabular">{fmt(payment.amt)}</span>
                <span className="font-mono text-mini text-zinc-500">{payment.src}</span>
              </div>
            </div>

            {/* SVG Pulsing Paths */}
            <div className="my-2">
              <svg viewBox="0 0 976 196" className="w-full h-auto block" style={{ transform: "translate3d(0,0,0)" }}>
                <path d="M488,4 C488,80 91,110 91,192" fill="none" stroke="#E4E4E7" strokeWidth="1.5" />
                <path d="M488,4 C488,80 290,110 290,192" fill="none" stroke="#E4E4E7" strokeWidth="1.5" />
                <path d="M488,4 C488,80 488,110 488,192" fill="none" stroke="#E4E4E7" strokeWidth="1.5" />
                <path d="M488,4 C488,80 686,110 686,192" fill="none" stroke="#E4E4E7" strokeWidth="1.5" />
                <path d="M488,4 C488,80 885,110 885,192" fill="none" stroke="#E4E4E7" strokeWidth="1.5" />

                {showPulses && [91, 290, 488, 686, 885].map((x, i) => (
                  <g key={`${run}-${i}`}>
                    <path
                      d={`M488,4 C488,80 ${x},110 ${x},192`}
                      fill="none"
                      stroke="#818CF8"
                      opacity="0.35"
                      strokeWidth="1.5"
                    />
                    <circle r="3.5" fill="#2563EB" opacity="0.9">
                      <animateMotion
                        dur="1.15s"
                        repeatCount="1"
                        fill="freeze"
                        path={`M488,4 C488,80 ${x},110 ${x},192`}
                        begin={`${i * 0.04}s`}
                      />
                    </circle>
                  </g>
                ))}
              </svg>
            </div>

            {/* Ledgers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {bucketMeta.map((bm) => {
                const val = balances[bm.k as keyof typeof balances];
                const delta = deltas ? deltas[bm.k] : 0;
                return (
                  <div key={bm.k} className="bg-white border border-zinc-200/70 rounded-xl p-4 flex flex-col gap-1.5 relative overflow-hidden transition-colors duration-200 hover:border-zinc-300">
                    <div className="font-mono text-micro text-blue-600 uppercase tracking-[0.1em] font-semibold">{bm.badge}</div>
                    <div className="font-medium text-[14px] text-zinc-900 leading-tight">{bm.name}</div>
                    <div className="text-mini text-zinc-400">{bm.desc}</div>
                    <div className="mt-2.5 flex items-baseline gap-2">
                      <span className="font-mono text-[17px] font-semibold text-zinc-950 tabular">{fmt(val)}</span>
                    </div>
                    <div className="font-mono text-mini text-emerald-600 h-4 transition-opacity duration-300">
                      {delta ? `+${fmt(delta)}` : ""}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </Reveal>
      </section>

      {/* Merchant counterpart pillars */}
      <section className="relative z-10 max-w-[1180px] mx-auto px-6 py-20">
        <Reveal className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl sm:text-[40px] font-semibold tracking-[-0.02em] text-zinc-950 leading-tight">
            The merchant counterpart to ALAT: The Evolution
          </h2>
          <p className="mt-5 text-small sm:text-[15px] text-zinc-500 max-w-2xl mx-auto leading-[1.7]">
            Wema brought voice banking, Tap and Pay, and uptime prediction to consumers. ALATPay Streams extends the same three pillars to merchants, so every SME gets the same intelligence their customers already trust.
          </p>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-3">
          {[
            {
              title: "Split Routing API",
              body: "Define routing rules dynamically via API. Route incoming payments instantly across tax, accounts payable, and reserves the moment they settle.",
            },
            {
              title: "Tap & Pay routing",
              body: "Every NFC and card payment splits automatically into tax, savings, and Accounts Payable ledgers.",
            },
            {
              title: "Streams Uptime",
              body: "Predict bank rail availability before disbursements, resulting in fewer failed payouts.",
            },
          ].map((p, idx) => (
            <Reveal key={idx} delay={idx * 0.1}>
              <article className="border border-zinc-200/70 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.03),0_8px_24px_-12px_rgba(9,9,11,0.06)] rounded-2xl p-7 flex flex-col gap-4 transition-shadow duration-300 hover:shadow-[0_1px_2px_rgba(9,9,11,0.04),0_16px_32px_-12px_rgba(9,9,11,0.1)] h-full">
                <h3 className="text-[16px] font-semibold text-zinc-950 mt-1">{p.title}</h3>
                <p className="text-small leading-[1.7] text-zinc-500">
                  {p.body}
                </p>
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-1 text-small font-medium text-blue-600 hover:text-blue-700 transition-colors mt-auto pt-2"
                >
                  Learn more
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      {/* voice + loans */}
      <section id="voice" className="relative z-10 max-w-[1180px] mx-auto px-6 py-4 pb-20 grid grid-cols-1 md:grid-cols-2 gap-5">
        <Reveal>
          <div className="border border-zinc-200/70 bg-white rounded-2xl p-8 shadow-[0_1px_2px_rgba(9,9,11,0.03),0_8px_24px_-12px_rgba(9,9,11,0.06)] flex flex-col gap-5 h-full">
            <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Rule Compilation Engine</div>
            <h3 className="m-0 font-display text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight text-zinc-950">Structured rules, compiled instantly</h3>
            <div className="flex flex-col gap-3">
              <div className="self-end max-w-[85%] bg-blue-600 rounded-2xl rounded-br-md px-4 py-3 text-small text-white shadow-[0_2px_8px_-2px_rgba(37,99,235,0.4)]">
                &quot;Split 20% of every payment to Accounts Payable.&quot;
              </div>
              <div className="self-start max-w-[90%] bg-zinc-50 border border-zinc-200/70 rounded-2xl rounded-bl-md px-4 py-3 text-small text-zinc-600">
                Done: rule set on <span className="text-zinc-900 font-semibold">Accounts Payable</span> ledger.
              </div>
              <code className="self-start font-mono text-mini text-blue-200 bg-zinc-950 rounded-xl px-4 py-3 shadow-[0_8px_20px_-8px_rgba(9,9,11,0.5)]">
                {`{ "kind": "PERCENTAGE", "value": 20, "ledger": "accounts_payable" }`}
              </code>
            </div>
            <p className="m-0 text-zinc-500 text-small leading-[1.7] mt-2">
              Our rule compiler parses simple directives and updates routing constraints in real time, with zero room for error.
            </p>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <div className="border border-zinc-200/70 bg-white rounded-2xl p-8 shadow-[0_1px_2px_rgba(9,9,11,0.03),0_8px_24px_-12px_rgba(9,9,11,0.06)] flex flex-col gap-5 h-full">
            <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Streams Loans</div>
            <h3 className="m-0 font-display text-2xl sm:text-[28px] font-semibold tracking-tight leading-tight text-zinc-950">Underwritten by your streams, not paperwork</h3>
            <div className="bg-zinc-50 border border-zinc-200/70 rounded-xl p-5 flex flex-col gap-3.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-micro text-emerald-600 uppercase tracking-[0.1em] font-semibold">Pre-approved</span>
                <span className="font-mono text-mini text-zinc-400">90 days of routed income</span>
              </div>
              <div className="font-mono text-3xl font-semibold text-zinc-950 tabular">₦2,400,000</div>
              <div className="flex gap-3 text-small text-zinc-500">
                <span>14% p.a.</span>
                <span className="text-zinc-300">·</span>
                <span>repaid at 6% of daily income</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="h-1.5 rounded-full bg-zinc-200 overflow-hidden">
                  <div className="w-[38%] h-full rounded-full bg-blue-600"></div>
                </div>
                <div className="flex justify-between font-mono text-micro text-zinc-400">
                  <span>LOAN_REPAYMENT ledger · auto-created</span>
                  <span className="text-blue-600 font-semibold">38% repaid</span>
                </div>
              </div>
            </div>
            <p className="m-0 text-zinc-500 text-small leading-[1.7] mt-2">
              Repayment is just another ledger, deducted at source from every payment, so merchants never miss an instalment.
            </p>
          </div>
        </Reveal>
      </section>

      {/* Engine Rules Details */}
      <section id="engine" className="relative z-10 max-w-[1180px] mx-auto px-6 py-16">
        <Reveal>
          <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Deterministic by design</div>
          <h2 className="font-display text-3xl sm:text-[40px] font-semibold tracking-[-0.025em] mt-4 max-w-lg leading-[1.12] text-zinc-950">
            One pure function decides where every kobo goes
          </h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
          {[
            { step: "01", title: "FIXED first", desc: "Fixed-naira ledgers are settled in strict priority order, capped at whatever funds remain from the incoming transaction." },
            { step: "02", title: "WEEKLY_FIXED", desc: "Behaves like a FIXED rule, but only fires on its configured day of the week (e.g., set aside Accounts Payable funds every Friday)." },
            { step: "03", title: "PERCENTAGE", desc: "Each percentage ledger takes its calculated percentage share of the remainder after FIXED rules are satisfied." },
            { step: "04", title: "OPERATING", desc: "Anything that remains unallocated lands directly in the merchant's core operating float for daily business use." }
          ].map((item, idx) => (
            <Reveal key={idx} delay={idx * 0.08}>
              <div className="border border-zinc-200/70 bg-white rounded-2xl p-6 shadow-[0_1px_2px_rgba(9,9,11,0.03),0_8px_24px_-12px_rgba(9,9,11,0.06)] flex flex-col gap-3 h-full">
                <div className="font-mono text-mini text-zinc-400 font-medium">{item.step}</div>
                <h3 className="font-semibold text-[16px] text-zinc-950 font-mono tracking-tight">{item.title}</h3>
                <p className="text-zinc-500 text-small leading-[1.7]">{item.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Visual Playground Sandbox */}
      <section id="playground" className="relative z-10 max-w-[1180px] mx-auto px-6 py-16">
        <Reveal>
          <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Interactive sandbox</div>
          <h2 className="font-display text-3xl sm:text-[40px] font-semibold tracking-[-0.025em] mt-4 leading-[1.12] text-zinc-950">
            Tune the split parameters
          </h2>
          <p className="text-zinc-500 text-[15px] mt-5 max-w-2xl leading-[1.7]">
            Modify the routing limits and percentages below. Run simulations to verify how income splits deterministically. No text chats, no AI non-determinism, just pure financial configuration.
          </p>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-12 items-start">
          {/* Rules configurator controls */}
          <Reveal className="lg:col-span-5">
            <form onSubmit={handleSimulatePlayground} className="bg-white border border-zinc-200/70 rounded-2xl p-6 shadow-[0_1px_2px_rgba(9,9,11,0.03),0_8px_24px_-12px_rgba(9,9,11,0.06)] flex flex-col gap-6">

              <div className="flex items-center gap-2 pb-4 border-b border-zinc-100">
                <Sliders className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-[14px] text-zinc-950">Split parameters</span>
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-small font-medium text-zinc-700 flex justify-between">
                  <span>Fixed supplier reserve</span>
                  <span className="text-zinc-950 font-mono font-semibold tabular">{fmt(rules.supplierFixed)}</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="25000"
                  step="1000"
                  value={rules.supplierFixed}
                  onChange={(e) => setRules(prev => ({ ...prev, supplierFixed: parseInt(e.target.value) || 0 }))}
                  className="slider w-full cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-small font-medium text-zinc-700 flex justify-between">
                  <span>VAT reserve</span>
                  <span className="text-zinc-950 font-mono font-semibold tabular">{rules.vatPercent}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="2.5"
                  value={rules.vatPercent}
                  onChange={(e) => setRules(prev => ({ ...prev, vatPercent: parseFloat(e.target.value) || 0 }))}
                  className="slider w-full cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-small font-medium text-zinc-700 flex justify-between">
                  <span>Emergency savings</span>
                  <span className="text-zinc-950 font-mono font-semibold tabular">{rules.savingsPercent}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="1"
                  value={rules.savingsPercent}
                  onChange={(e) => setRules(prev => ({ ...prev, savingsPercent: parseFloat(e.target.value) || 0 }))}
                  className="slider w-full cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-small font-medium text-zinc-700 flex justify-between">
                  <span>Salary allocation</span>
                  <span className="text-zinc-950 font-mono font-semibold tabular">{rules.salaryPercent}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="1"
                  value={rules.salaryPercent}
                  onChange={(e) => setRules(prev => ({ ...prev, salaryPercent: parseFloat(e.target.value) || 0 }))}
                  className="slider w-full cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-2.5 pt-5 border-t border-zinc-100">
                <label className="text-small font-medium text-zinc-700">Test incoming amount</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-zinc-400 text-small">₦</span>
                    <input
                      type="number"
                      value={customAmount}
                      onChange={(e) => setCustomAmount(e.target.value)}
                      className="w-full bg-white border border-zinc-200 rounded-lg py-2.5 pl-8 pr-4 text-small text-zinc-900 font-mono tabular focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/15 transition-shadow"
                      placeholder="Enter amount"
                    />
                  </div>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-small px-5 active:scale-[0.98] transition-all duration-200"
                  >
                    Split
                  </Button>
                </div>
              </div>

            </form>
          </Reveal>

          {/* Visual calculation display */}
          <Reveal delay={0.12} className="lg:col-span-7">
            <div className="bg-zinc-950 rounded-2xl overflow-hidden shadow-[0_24px_48px_-16px_rgba(9,9,11,0.4)] font-mono">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                <Terminal className="w-4 h-4 text-zinc-500" />
                <span className="text-micro text-zinc-500">Live math output · {fmt(parseFloat(customAmount) || 50000)} split</span>
              </div>

              <div className="p-6 text-zinc-300 text-mini leading-[1.8] flex flex-col gap-4 overflow-x-auto">
                <div>
                  <span className="text-zinc-600">{"// incoming parameters"}</span><br />
                  amount_naira: <span className="text-[#7DD3FC]">{parseFloat(customAmount) || 50000}</span>
                </div>

                <div>
                  <span className="text-zinc-600">{"// stage 1: FIXED priority routing"}</span><br />
                  accounts_payable_ledger: min({rules.supplierFixed}, amount_naira) = <span className="text-[#A5B4FC]">{fmt(splitResultPreview.supplier)}</span><br />
                  remainder: amount_naira - accounts_payable_ledger = <span className="text-emerald-400">{fmt(Math.max(0, (parseFloat(customAmount) || 50000) - splitResultPreview.supplier))}</span>
                </div>

                <div>
                  <span className="text-zinc-600">{"// stage 2: PERCENTAGE allocations from remainder"}</span><br />
                  tax_settlement_ledger (tax {rules.vatPercent}%): remainder * {rules.vatPercent / 100} = <span className="text-[#A5B4FC]">{fmt(splitResultPreview.vat)}</span><br />
                  capital_reserve_ledger (savings {rules.savingsPercent}%): remainder * {rules.savingsPercent / 100} = <span className="text-[#A5B4FC]">{fmt(splitResultPreview.savings)}</span><br />
                  payroll_ledger (salary {rules.salaryPercent}%): remainder * {rules.salaryPercent / 100} = <span className="text-[#A5B4FC]">{fmt(splitResultPreview.salary)}</span>
                </div>

                <div>
                  <span className="text-zinc-600">{"// stage 3: REMAINDER fallback"}</span><br />
                  operating_float_ledger: remainder - tax - savings - salary = <span className="text-emerald-400">{fmt(splitResultPreview.operating)}</span>
                </div>

                <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between">
                  <span className="text-zinc-600">Total calculated sum:</span>
                  <span className="text-emerald-400 font-semibold text-small tabular">
                    {fmt(
                      splitResultPreview.supplier +
                      splitResultPreview.vat +
                      splitResultPreview.savings +
                      splitResultPreview.salary +
                      splitResultPreview.operating
                    )}
                  </span>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Uptime prediction */}
      <section id="uptime" className="relative z-10 max-w-[1180px] mx-auto px-6 py-16">
        <Reveal>
          <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Streams Uptime</div>
          <h2 className="font-display text-3xl sm:text-[40px] font-semibold tracking-[-0.025em] mt-4 max-w-2xl leading-[1.12] text-zinc-950">
            We know a bank is down before your customer does
          </h2>
          <p className="text-zinc-500 text-[15px] mt-5 max-w-xl leading-[1.7]">
            Settlement rails are scored continuously. When a destination bank degrades, routed transfers detour automatically, avoiding failed splits and stranded funds.
          </p>
        </Reveal>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-12">
          {bankData.map((bank, i) => {
            const ok = bank.pct >= 99;
            const warn = bank.pct >= 96 && bank.pct < 99;
            const dotColor = ok ? "bg-emerald-500" : warn ? "bg-amber-500" : "bg-red-500";
            const textColor = ok ? "text-emerald-600" : warn ? "text-amber-600" : "text-red-600";

            const bars = Array.from({ length: 14 }, (_, j) => {
              const v = Math.abs(Math.sin(i * 7.3 + j * 2.1));
              const dip = !ok && j > 9 && v > 0.6;
              const h = dip ? 25 + v * 20 : 55 + v * 45;
              const bg = dip ? (warn ? "bg-amber-400" : "bg-red-400") : "bg-blue-600/65";
              return { h: h.toFixed(2) + "%", bg };
            });

            return (
              <Reveal key={bank.code} delay={(i % 4) * 0.06}>
                <div className="border border-zinc-200/70 rounded-xl p-4 bg-white shadow-[0_1px_2px_rgba(9,9,11,0.03)] hover:border-zinc-300 transition-colors flex flex-col gap-3 h-full">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-small text-zinc-900">{bank.name}</span>
                    <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
                  </div>

                  <div className="flex items-end gap-[3px] h-7">
                    {bars.map((bar, idx) => (
                      <div
                        key={idx}
                        className={`w-[5px] rounded-[2px] ${bar.bg}`}
                        style={{ height: bar.h }}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between font-mono text-micro leading-none mt-1">
                    <span className="text-zinc-400">{ok ? "optimal" : warn ? "degraded" : "rerouting"}</span>
                    <span className={`${textColor} tabular`}>{bank.pct.toFixed(2)}%</span>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* API routes details */}
      <section id="api" className="relative z-10 max-w-[1180px] mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          <Reveal className="lg:col-span-5">
            <div className="font-mono text-mini text-blue-600 uppercase tracking-[0.16em] font-semibold">Developer surface</div>
            <h2 className="font-display text-3xl sm:text-[40px] font-semibold tracking-[-0.025em] mt-4 leading-[1.12] text-zinc-950">
              Nine endpoints.<br />That&apos;s the whole API.
            </h2>
            <div className="flex flex-col mt-9 border border-zinc-200/70 rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(9,9,11,0.03)] font-mono bg-white">
              {[
                { method: "POST", path: "/api/merchants", color: "text-emerald-600" },
                { method: "POST", path: "/api/buckets", color: "text-emerald-600" },
                { method: "GET", path: "/api/merchants/:id/buckets", color: "text-blue-600" },
                { method: "GET", path: "/api/merchants/:id/transactions", color: "text-blue-600" },
                { method: "POST", path: "/api/transactions/simulate", color: "text-emerald-600" },
                { method: "POST", path: "/api/chat", color: "text-emerald-600" },
                { method: "POST", path: "/api/chat/voice", color: "text-emerald-600" },
                { method: "GET", path: "/api/uptime", color: "text-blue-600" },
                { method: "GET", path: "/api/merchants/:id/loans", color: "text-blue-600" },
              ].map((ep, idx) => (
                <div key={idx} className="flex items-center gap-4 px-4 py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/60 transition-colors">
                  <span className={`text-micro font-semibold w-11 ${ep.color}`}>{ep.method}</span>
                  <span className="text-mini text-zinc-600">{ep.path}</span>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.12} className="lg:col-span-7">
            <div className="bg-zinc-950 rounded-2xl overflow-hidden shadow-[0_24px_48px_-16px_rgba(9,9,11,0.4)] font-mono">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-zinc-800"></span>
                <span className="ml-3 text-micro text-zinc-500">simulate a ₦50,000 split</span>
              </div>

              <pre className="p-6 text-zinc-300 text-mini leading-[1.8] overflow-x-auto">
                <span className="text-zinc-600">{"# request"}</span><br />
                <span className="text-[#7DD3FC]">curl</span> -X POST https://api.alatpay.ng/v1/streams/transactions/simulate \<br />
                &nbsp;&nbsp;-d <span className="text-emerald-400">{`'{ "merchantId": "mrc_wema01", "amountNaira": 50000 }'`}</span><br /><br />
                <span className="text-zinc-600">{"# response (always sums exactly to the input)"}</span><br />
                {`{
  "splits": [
    { "ledger": "Accounts Payable",  "amount": 8000 },
    { "ledger": "Tax Settlement",   "amount": 4200 },
    { "ledger": "Capital Reserve",   "amount": 6300 },
    { "ledger": "Payroll",           "amount": 8400 },
    { "ledger": "Operating Float",   "amount": 23100 }
  ]
}`}
              </pre>
            </div>
          </Reveal>

        </div>
      </section>

      {/* CTA section — dark immersive panel with the cards visual */}
      <section className="relative z-10 max-w-[1180px] mx-auto px-6 pb-28 pt-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl py-20 px-6 text-center bg-zinc-950 shadow-[0_32px_64px_-24px_rgba(9,9,11,0.5)]">
            <Image
              src="/floating_cards_hero.png"
              alt=""
              fill
              sizes="(max-width: 1180px) 100vw, 1180px"
              className="object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/40 to-zinc-950/80" />
            <div className="relative">
              <h2 className="font-display text-2xl sm:text-[36px] font-semibold tracking-[-0.02em] text-white">Start building with ALATPay Streams</h2>
              <p className="text-zinc-300 text-small max-w-md mx-auto mt-4 leading-[1.7]">
                Three steps: configure ledgers, set rules in plain language, go live.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-9">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 h-12 px-8 text-[15px] font-semibold text-zinc-950 bg-white hover:bg-zinc-100 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] group"
                >
                  Start for free
                </Link>
                <Link
                  href="/dashboard?demo=1"
                  className="inline-flex items-center h-12 px-8 text-[15px] font-medium text-white border border-white/25 hover:border-white/50 hover:bg-white/5 rounded-full transition-colors"
                >
                  See a demo
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-white shadow-[0_-8px_30px_rgba(9,9,11,0.015)]">
        <div className="max-w-[1180px] mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-5 gap-10">

          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-[24px] h-[24px] rounded-[6px] bg-blue-600 flex items-center justify-center text-white">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12c5 0 5-7 10-7s5 7 10 7" />
                  <path d="M2 12c5 0 5 7 10 7s5-7 10-7" />
                </svg>
              </div>
              <span className="font-display font-semibold text-[15px] tracking-tight text-zinc-950">
                ALATPay <span className="text-blue-600">Streams</span>
              </span>
            </div>
            <p className="text-small text-zinc-500 max-w-sm leading-[1.7]">
              Programmable settlement routing and instant ledger reconciliation for modern African merchants and platforms. Underwritten by Wema Bank.
            </p>
            <span className="font-mono text-micro text-zinc-400 mt-2">
              © 2026 ALATPay. All rights reserved.
            </span>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="font-mono text-micro text-zinc-400 uppercase tracking-[0.14em] font-semibold">Product</span>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Split Routing</Link>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Developer Ledgers</Link>
            <Link href="/dashboard" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Uptime Rerouting</Link>
            <Link href="/offers" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Streams Loans</Link>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="font-mono text-micro text-zinc-400 uppercase tracking-[0.14em] font-semibold">Developers</span>
            <a href="#api" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">API Reference</a>
            <a href="#playground" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Split Sandbox</a>
            <a href="#uptime" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Network Status</a>
            <Link href="/dashboard" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Console Log</Link>
          </div>

          <div className="flex flex-col gap-3.5">
            <span className="font-mono text-micro text-zinc-400 uppercase tracking-[0.14em] font-semibold">Security &amp; Legal</span>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Privacy Policy</Link>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Terms of Service</Link>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">Merchant Agreement</Link>
            <Link href="/onboarding" className="text-small text-zinc-500 hover:text-zinc-950 transition-colors">SLA Guarantees</Link>
          </div>

        </div>
      </footer>

    </div>
  );
}
