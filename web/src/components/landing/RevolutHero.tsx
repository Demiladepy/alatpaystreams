"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Lock } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(ScrollTrigger, useGSAP);

interface RevolutHeroProps {
  /** Live operating-float balance, already formatted (e.g. "₦1,276,400") */
  operatingFloat: string;
  /** Formatted delta while a split is landing, or null */
  delta: string | null;
}

/**
 * Revolut hero→section morph.
 *
 * At rest the photo is a full-bleed hero with the balance cluster floating
 * over it. Scrolling (pinned) condenses the photo into a white-bordered
 * portrait card that shrinks to the centre of a three-card row, while the
 * backdrop fades to white, side cards slide in, and the section heading
 * rises in above — the hero literally becomes the next section.
 */
export function RevolutHero({ operatingFloat, delta }: RevolutHeroProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const bgRef = useRef<HTMLDivElement | null>(null);
  const heroTextRef = useRef<HTMLDivElement | null>(null);
  const whiteBgRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLDivElement | null>(null);
  const rowRef = useRef<HTMLDivElement | null>(null);
  const centerCardRef = useRef<HTMLDivElement | null>(null);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const cardImgRef = useRef<HTMLDivElement | null>(null);
  const leftCardRef = useRef<HTMLDivElement | null>(null);
  const rightCardRef = useRef<HTMLDivElement | null>(null);

  useGSAP(
    () => {
      const card = centerCardRef.current;
      if (!card) return;

      const isDesktop = () => window.innerWidth >= 768;

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

      tl
        // Hero copy lifts away first
        .to(heroTextRef.current, { y: -48, autoAlpha: 0, duration: 0.22, ease: "power1.in" }, 0)
        // The card's own photo fades in over the identical backdrop, so the
        // outline frame becomes a solid card without a visible jump
        .fromTo(cardImgRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 }, 0.03)
        // The frame outline itself morphs into the white-bordered card:
        // portrait outline → slightly smaller solid card, photo cropping with it
        .fromTo(
          card,
          {
            width: () => (isDesktop() ? Math.min(430, window.innerWidth * 0.3) : Math.round(window.innerWidth * 0.82)),
            height: () => (isDesktop() ? Math.round(window.innerHeight * 0.74) : Math.round(window.innerHeight * 0.56)),
            borderRadius: 28,
            padding: 0,
            backgroundColor: "rgba(255,255,255,0)",
            borderColor: "rgba(255,255,255,0.65)",
          },
          {
            width: () => (isDesktop() ? 360 : Math.round(window.innerWidth * 0.8)),
            height: () => (isDesktop() ? 500 : 460),
            borderRadius: 24,
            padding: 9,
            backgroundColor: "rgba(255,255,255,1)",
            borderColor: "rgba(255,255,255,0)",
            duration: 0.55,
            ease: "power1.inOut",
          },
          0.05
        )
        // Balance cluster rides from lower-centre, fading in as the card condenses
        .fromTo(
          clusterRef.current,
          { y: 160, scale: 1.4, autoAlpha: 0 },
          { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "power1.inOut" },
          0.05
        )
        // Backdrop fades to the page white
        .to(whiteBgRef.current, { autoAlpha: 1, duration: 0.3, ease: "power1.inOut" }, 0.32)
        // Side cards slide in around the centre card
        .fromTo(
          leftCardRef.current,
          { autoAlpha: 0, x: -56, scale: 0.94 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.28, ease: "power1.out" },
          0.42
        )
        .fromTo(
          rightCardRef.current,
          { autoAlpha: 0, x: 56, scale: 0.94 },
          { autoAlpha: 1, x: 0, scale: 1, duration: 0.28, ease: "power1.out" },
          0.42
        )
        // Section heading rises in above the row
        .fromTo(
          headRef.current,
          { autoAlpha: 0, y: 32 },
          { autoAlpha: 1, y: 0, duration: 0.25, ease: "power1.out" },
          0.58
        )
        // Hold the settled section briefly before the pin releases
        .to({}, { duration: 0.17 }, 0.83);
    },
    { scope: wrapperRef }
  );

  const sideCard =
    "relative hidden md:flex shrink-0 w-[300px] h-[440px] rounded-3xl overflow-hidden shadow-[0_24px_48px_-16px_rgba(9,9,11,0.25)] will-change-transform flex-col opacity-0";

  const sideChip =
    "relative m-3 mt-auto flex items-center gap-3 bg-white rounded-xl px-3.5 py-2.5 shadow-[0_12px_32px_-12px_rgba(9,9,11,0.35)]";

  return (
    <div ref={wrapperRef} className="relative h-[280vh]">
      <div className="sticky top-0 h-screen w-full overflow-hidden">

        {/* Layer 0 — full-bleed hero photo (stays behind while the card condenses) */}
        <div ref={bgRef} className="absolute inset-0">
          <Image
            src="/hero_person.jpg"
            alt="Nigerian shop owner standing against a clear blue sky"
            fill
            priority
            sizes="100vw"
            className="object-cover object-[center_72%]"
          />
          {/* Light touch — the sky is the negative space, keep it bright like Revolut */}
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/25 via-transparent to-zinc-950/20" />
        </div>

        {/* Layer 1 — white page backdrop, fades in as the section takes over */}
        <div ref={whiteBgRef} className="absolute inset-0 bg-[#FAFAFB] opacity-0" />

        {/* Layer 2 — section heading (hidden until the morph settles) */}
        <div
          ref={headRef}
          className="absolute inset-x-0 top-[12svh] z-[15] flex flex-col items-center text-center px-6 opacity-0 will-change-transform"
        >
          <h2 className="font-display text-[32px] sm:text-[44px] font-semibold tracking-[-0.025em] text-zinc-950">
            Your income, reimagined
          </h2>
          <p className="text-zinc-500 text-[14.5px] sm:text-[15.5px] max-w-[560px] mt-3 leading-[1.6]">
            Split smartly, save automatically, and watch every ledger fill,
            all with one ALATPay Streams account.
          </p>
          <Link
            href="/onboarding"
            className="mt-5 inline-flex items-center h-11 px-7 text-[14.5px] font-semibold text-white bg-zinc-950 hover:bg-zinc-800 rounded-full transition-colors"
          >
            Route your income
          </Link>
        </div>

        {/* Layer 3 — the card row; centre card starts as the full viewport */}
        <div
          ref={rowRef}
          className="absolute inset-0 z-20 flex items-center justify-center gap-6 pt-[29svh]"
        >

          {/* Left card — Capital Reserve */}
          <div ref={leftCardRef} className={sideCard}>
            <Image src="/card_reserve.jpg" alt="Market woman at her fabric stall holding a payment terminal" fill sizes="300px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-zinc-950/10 to-zinc-950/35" />
            <div className="relative flex flex-col items-center gap-1 mt-14">
              <span className="text-[12px] font-medium text-zinc-200">Capital Reserve</span>
              <span className="font-display text-[26px] font-semibold tracking-tight text-white tabular [text-shadow:0_1px_12px_rgba(9,9,11,0.5)]">₦618,525</span>
              <Link href="/dashboard" className="mt-1.5 inline-flex items-center h-8 px-4 text-[12.5px] font-semibold text-zinc-950 bg-white rounded-full shadow-sm hover:scale-[1.03] transition-transform">
                Ledgers
              </Link>
            </div>
            <div className={sideChip}>
              <div className="w-8 h-8 rounded-full bg-[#635BFF] flex items-center justify-center text-white text-[10px] font-mono font-bold">TX</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-zinc-950">Tax settled</div>
                <div className="text-[11px] text-zinc-400">Today, 09:02</div>
              </div>
              <div className="text-[12.5px] font-semibold text-zinc-950 tabular">-₦4,200</div>
            </div>
          </div>

          {/* Centre card — the outline frame that morphs into the white card */}
          <div
            ref={centerCardRef}
            className="relative shrink-0 overflow-hidden will-change-[width,height] z-10 border-[1.5px] border-white/65 rounded-[28px] w-[82vw] md:w-[min(30vw,430px)] h-[56svh] md:h-[74svh]"
          >
            <div className="relative w-full h-full rounded-[18px] overflow-hidden">
              {/* Card's own photo — hidden at rest (backdrop shows through the frame),
                  fades in as the frame solidifies so the crop travels with the card */}
              <div ref={cardImgRef} className="absolute inset-0 opacity-0">
                <Image
                  src="/hero_person.jpg"
                  alt="Nigerian shop owner standing against a clear blue sky"
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover object-[center_60%]"
                />
                {/* Gentle scrim — enough for the type, keeps the photo alive */}
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/20 via-transparent to-zinc-950/45" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_38%_at_50%_50%,rgba(9,9,11,0.32),transparent_75%)]" />
              </div>

              {/* Balance cluster — positioned and styled identical to Left/Right cards */}
              <div
                ref={clusterRef}
                className="absolute top-0 inset-x-0 flex flex-col items-center gap-1 mt-14 will-change-transform opacity-0"
              >
                <span className="text-[12px] font-medium text-zinc-200">Operating Float</span>
                <span className="font-display text-[26px] font-semibold tracking-tight text-white tabular [text-shadow:0_1px_12px_rgba(9,9,11,0.5)]">
                  {operatingFloat}
                </span>
                <span className={`mt-0.5 font-mono text-[10px] text-emerald-300 h-4 transition-opacity duration-300 ${delta ? "opacity-100" : "opacity-0"}`}>
                  {delta ? `+${delta}` : "+"}
                </span>
                <Link
                  href="/dashboard"
                  className="mt-1.5 inline-flex items-center h-8 px-4 text-[12.5px] font-semibold text-zinc-950 bg-white rounded-full shadow-sm hover:scale-[1.03] transition-transform"
                >
                  Ledgers
                </Link>
              </div>

              {/* Trust badges — docked at the bottom in both states */}
              <div className="absolute bottom-6 inset-x-0 flex justify-center">
                <div className="flex items-stretch bg-black/45 backdrop-blur-md border border-white/10 rounded-xl shadow-lg overflow-hidden text-white/90">
                  <div className="flex items-center justify-center gap-1.5 py-2 px-3.5">
                    <Lock className="h-3 w-3 text-white/80" />
                    <span className="font-mono text-[9px] font-bold tracking-wide">SPLIT AT SOURCE</span>
                  </div>
                  <div className="w-px bg-white/10" />
                  <div className="flex items-center justify-center py-2 px-3.5">
                    <span className="font-mono text-[9px] font-bold tracking-wide">WEMA RAILS · 035</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right card — Payroll */}
          <div ref={rightCardRef} className={sideCard}>
            <Image src="/card_payroll.jpg" alt="Young tailor working at his bench in a sunlit workshop" fill sizes="300px" className="object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/55 via-zinc-950/10 to-zinc-950/35" />
            <div className="relative flex flex-col items-center gap-1 mt-14">
              <span className="text-[12px] font-medium text-zinc-200">Payroll</span>
              <span className="font-display text-[26px] font-semibold tracking-tight text-white tabular [text-shadow:0_1px_12px_rgba(9,9,11,0.5)]">₦833,100</span>
              <Link href="/dashboard" className="mt-1.5 inline-flex items-center h-8 px-4 text-[12.5px] font-semibold text-zinc-950 bg-white rounded-full shadow-sm hover:scale-[1.03] transition-transform">
                Ledgers
              </Link>
            </div>
            <div className={sideChip}>
              <div className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center text-white text-[10px] font-mono font-bold">PA</div>
              <div className="flex-1 min-w-0">
                <div className="text-[12.5px] font-semibold text-zinc-950">Supplier paid</div>
                <div className="text-[11px] text-zinc-400">Friday · auto</div>
              </div>
              <div className="text-[12.5px] font-semibold text-zinc-950 tabular">-₦8,000</div>
            </div>
          </div>
        </div>

        {/* Layer 4 — hero copy, Revolut composition: upper-left, short paragraph, one CTA */}
        <div
          ref={heroTextRef}
          className="absolute z-30 left-[9vw] sm:left-[10vw] top-[12svh] sm:top-[13svh] flex flex-col items-start will-change-transform"
        >
          <h1 className="font-display font-semibold text-[46px] sm:text-[68px] leading-[1.02] tracking-[-0.03em] text-white [text-shadow:0_2px_24px_rgba(9,9,11,0.5)] whitespace-nowrap">Money in. Already sorted.</h1>
          <p className="text-zinc-200 text-[14.5px] sm:text-[15.5px] max-w-[340px] mt-6 leading-[1.65] [text-shadow:0_1px_12px_rgba(9,9,11,0.5)]">Every payment splits across tax, savings, suppliers and salary, the instant it lands.</p>
          <Link
            href="/onboarding"
            className="mt-7 inline-flex items-center h-12 px-8 text-[15px] font-semibold text-white bg-zinc-950 hover:bg-zinc-900 rounded-full transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_12px_32px_-12px_rgba(9,9,11,0.6)]"
          >
            Get Started
          </Link>
        </div>

      </div>
    </div>
  );
}
