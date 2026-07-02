"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Revolut-style three-card parallax zoom hero.
 * A 300vh scroll region pins (CSS sticky) a full-screen stage; as the user
 * scrubs, the side cards translate outwards and fade, the header lifts away,
 * and the center card scales until it fills the viewport.
 */
export function HeroZoom() {
  const wrapperRef = useRef<HTMLElement | null>(null);
  const headerRef = useRef<HTMLDivElement | null>(null);
  const leftRef = useRef<HTMLDivElement | null>(null);
  const centerRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const center = centerRef.current;
      if (!center) return;

      // Scale needed for the center card to cover the viewport, with headroom.
      const coverScale = () => {
        const r = center.getBoundingClientRect();
        const base = r.width / (gsap.getProperty(center, "scale") as number);
        const baseH = r.height / (gsap.getProperty(center, "scale") as number);
        return Math.max(window.innerWidth / base, window.innerHeight / baseH) * 1.06;
      };

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrapperRef.current,
          start: "top top",
          end: "bottom bottom",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      tl.to(headerRef.current, { y: -50, autoAlpha: 0, duration: 0.35, ease: "power1.in" }, 0)
        .to(leftRef.current, { xPercent: -200, autoAlpha: 0, duration: 0.7, ease: "power1.in" }, 0)
        .to(rightRef.current, { xPercent: 200, autoAlpha: 0, duration: 0.7, ease: "power1.in" }, 0)
        .to(center, { scale: coverScale, duration: 1, ease: "power2.in" }, 0);
    },
    { scope: wrapperRef }
  );

  const chip =
    "flex items-center gap-3 bg-white rounded-2xl px-4 py-3 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.35)]";

  return (
    <header ref={wrapperRef} className="relative h-[300vh] bg-[#FAFAFB]">

      {/* Nav — persists over the whole page */}
      <nav className="fixed top-0 inset-x-0 z-50 border-b border-zinc-200/40 bg-[#FAFAFB]/80 backdrop-blur-md">
        <div className="flex items-center justify-between max-w-[1180px] mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-[26px] h-[26px] rounded-[7px] bg-[#635BFF] flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c5 0 5-7 10-7s5 7 10 7" />
                <path d="M2 12c5 0 5 7 10 7s5-7 10-7" />
              </svg>
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-zinc-950">
              ALATPay <span className="text-[#635BFF]">Streams</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex text-[#635BFF] hover:bg-[#635BFF]/5 active:scale-[0.98] transition-all duration-200">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" asChild className="bg-[#635BFF] hover:bg-[#5851E0] text-white font-semibold rounded-full px-5 active:scale-[0.98] transition-all duration-200">
              <Link href="/onboarding">Request access</Link>
            </Button>
          </div>
        </div>
      </nav>

      <div className="sticky top-0 h-screen overflow-hidden flex flex-col items-center justify-center px-6">

        {/* Header text */}
        <div ref={headerRef} className="flex flex-col items-center text-center will-change-transform pt-16">
          <h1 className="font-display font-semibold text-[44px] sm:text-[72px] leading-[1.0] tracking-[-0.03em] text-zinc-950">
            Money in. Already <span className="text-[#635BFF]">sorted.</span>
          </h1>
          <p className="text-zinc-500 text-[16px] sm:text-[18px] max-w-[520px] mt-6 leading-[1.6]">
            Programmable income routing for Nigerian SMEs. Every payment splits
            across tax, savings, suppliers and salary, the instant it lands.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-3.5 mt-8">
            <Link
              href="/onboarding"
              className="inline-flex items-center gap-2 h-12 px-8 text-[15px] font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-full transition-colors group"
            >
              Get started for free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <div className="hidden sm:inline-flex items-center gap-2.5 h-12 bg-white border border-zinc-200 rounded-full px-6 font-mono text-[12.5px] text-zinc-500">
              <span className="text-[#635BFF] font-semibold">$</span>
              <span>POST /api/transactions/simulate</span>
            </div>
          </div>
        </div>

        {/* Three-card stage */}
        <div className="relative flex items-center justify-center gap-5 sm:gap-8 mt-12">

          {/* Left card — Tax ledger */}
          <div
            ref={leftRef}
            className="relative hidden md:flex w-[240px] lg:w-[280px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl will-change-transform flex-col justify-end p-4"
          >
            <Image
              src="/floating_cards_hero.png"
              alt=""
              fill
              sizes="280px"
              className="object-cover object-left-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 via-transparent to-transparent" />
            <div className={`relative ${chip}`}>
              <div className="w-9 h-9 rounded-full bg-[#635BFF] flex items-center justify-center text-white text-[11px] font-mono font-bold">
                TX
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-zinc-950">Tax Settlement</div>
                <div className="text-[11.5px] text-zinc-400">10% of remainder</div>
              </div>
              <div className="text-[13.5px] font-semibold text-zinc-950 tabular">₦416,550</div>
            </div>
          </div>

          {/* Center card — Operating Float (the one that zooms) */}
          <div
            ref={centerRef}
            className="relative w-[280px] sm:w-[320px] lg:w-[360px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl will-change-transform origin-center flex flex-col items-center justify-between py-8 px-5 z-10"
          >
            <Image
              src="/floating_cards_hero.png"
              alt="Glass payment cards floating over streams of light"
              fill
              priority
              sizes="360px"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/35 via-transparent to-zinc-950/45" />
            <div className="relative flex flex-col items-center gap-1 mt-6">
              <span className="text-[13px] font-medium text-zinc-200">Operating Float</span>
              <span className="font-display text-[32px] font-semibold tracking-tight text-white tabular [text-shadow:0_2px_16px_rgba(9,9,11,0.6)]">
                ₦1,276,400
              </span>
              <Link
                href="/dashboard"
                className="mt-2 inline-flex items-center h-9 px-5 text-[13.5px] font-semibold text-zinc-950 bg-white rounded-full shadow-[0_8px_24px_-8px_rgba(9,9,11,0.4)] hover:scale-[1.03] transition-transform"
              >
                Ledgers
              </Link>
            </div>
            <div className="relative flex items-stretch w-full bg-white rounded-2xl shadow-[0_12px_32px_-12px_rgba(9,9,11,0.35)] overflow-hidden">
              <div className="flex-1 flex items-center justify-center py-3 px-2">
                <span className="font-mono text-[9.5px] font-bold tracking-wide text-zinc-950">SPLIT AT SOURCE</span>
              </div>
              <div className="w-px bg-zinc-200" />
              <div className="flex-1 flex items-center justify-center py-3 px-2">
                <span className="font-mono text-[9.5px] font-bold tracking-wide text-zinc-950 text-center leading-tight">WEMA RAILS · 035</span>
              </div>
            </div>
          </div>

          {/* Right card — Payroll ledger */}
          <div
            ref={rightRef}
            className="relative hidden md:flex w-[240px] lg:w-[280px] aspect-[3/4] rounded-3xl overflow-hidden shadow-2xl will-change-transform flex-col justify-end p-4"
          >
            <Image
              src="/floating_cards_hero.png"
              alt=""
              fill
              sizes="280px"
              className="object-cover object-right-bottom"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/50 via-transparent to-transparent" />
            <div className={`relative ${chip}`}>
              <div className="w-9 h-9 rounded-full bg-zinc-950 flex items-center justify-center text-white text-[11px] font-mono font-bold">
                PA
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-semibold text-zinc-950">Payroll</div>
                <div className="text-[11.5px] text-zinc-400">Fridays · auto</div>
              </div>
              <div className="text-[13.5px] font-semibold text-zinc-950 tabular">₦833,100</div>
            </div>
          </div>

        </div>
      </div>
    </header>
  );
}
