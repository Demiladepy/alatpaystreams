"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { Button } from "@/components/ui/button";

gsap.registerPlugin(ScrollTrigger);

export function ParallaxHero() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinnedRef = useRef<HTMLDivElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  useGSAP(() => {
    if (!containerRef.current || !pinnedRef.current || !cardRef.current || !textRef.current) return;

    // Create scroll timeline linking progress directly to scrollbar
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: 1,
        pin: pinnedRef.current,
        pinSpacing: false, // Smooth pinning transitions
      },
    });

    // Animate text fading out and sliding upwards
    tl.to(textRef.current, {
      opacity: 0,
      y: -100,
      scale: 0.95,
      ease: "power1.inOut",
      duration: 1.5,
    }, 0);

    // Zoom card to fill screen, removing rounded corners as it covers viewport
    tl.to(cardRef.current, {
      scale: 5.5,
      y: "-26vh", // Centering pull-up as it zooms
      borderRadius: "0px",
      ease: "power2.inOut",
      duration: 3,
    }, 0);

    // Fade in overlay details on the cards as the zoom completes
    if (overlayRef.current) {
      tl.to(overlayRef.current, {
        opacity: 1,
        scale: 1,
        ease: "power1.out",
        duration: 1.2,
      }, 1.8);
    }
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="relative w-full h-[260vh] bg-[#FAFAFB] z-10">
      
      {/* Pinned Viewport Container */}
      <div 
        ref={pinnedRef} 
        className="pinned-content sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between items-center select-none pt-28 pb-12"
      >
        
        {/* Glow Halo Backdrop */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(800px_450px_at_50%_40%,rgba(99,91,255,0.03),transparent_70%)] z-0" />
        
        {/* Nav Over Hero */}
        <nav className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between max-w-[1180px] mx-auto px-6 py-6 bg-transparent">
          <div className="flex items-center gap-3">
            <div className="w-[26px] h-[26px] rounded-[7px] bg-[#635BFF] flex items-center justify-center text-white">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12c5 0 5-7 10-7s5 7 10 7" />
                <path d="M2 12c5 0 5 7 10 7s5-7 10-7" />
              </svg>
            </div>
            <span className="font-semibold text-[17px] tracking-tight text-zinc-950">
              ALATPay <span className="text-[#635BFF]">Streams</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button size="sm" variant="ghost" asChild className="hidden sm:inline-flex text-[#635BFF] hover:bg-[#635BFF]/5 active:scale-[0.98] transition-all duration-200">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            <Button size="sm" asChild className="bg-[#635BFF] hover:bg-[#5851E0] text-white font-semibold rounded-full px-5 active:scale-[0.98] transition-all duration-200">
              <Link href="/onboarding">Request access</Link>
            </Button>
          </div>
        </nav>

        {/* Text Header (Fades and slides up on Scroll) */}
        <div 
          ref={textRef} 
          className="hero-text-fade relative z-20 text-center px-6 flex flex-col items-center max-w-4xl will-change-[transform,opacity]"
        >
          <h1 className="font-semibold text-4xl sm:text-[62px] leading-[1.03] tracking-tighter text-zinc-950">
            Money in. Already <span className="bg-gradient-to-r from-[#635BFF] to-[#0EA5E9] bg-clip-text text-transparent">sorted.</span>
          </h1>
          <p className="text-zinc-655 text-body max-w-xl mt-6 leading-relaxed">
            Programmable income routing for Nigerian SMEs. Every payment is split across tax, savings, suppliers, salary and loan repayments, the instant it lands.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full sm:w-auto">
            <Button size="lg" asChild className="bg-[#635BFF] hover:bg-[#5851E0] text-white font-medium rounded-lg px-8 shadow-lg shadow-[#635BFF]/10 border-0 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto">
              <Link href="/onboarding">Get started for free</Link>
            </Button>
            <div className="flex items-center justify-center gap-2.5 bg-zinc-100/80 border border-zinc-200 rounded-lg px-5 py-3 font-mono text-small text-zinc-700 shadow-sm w-full sm:w-auto">
              <span className="text-[#635BFF] font-semibold">$</span>
              <span>POST /api/transactions/simulate</span>
            </div>
          </div>
        </div>

        {/* Floating Glassmorphic Zoom Card (Scales and moves to center on Scroll) */}
        <div 
          ref={cardRef} 
          className="hero-card-zoom relative z-10 w-[330px] sm:w-[480px] aspect-[1.35/1] rounded-3xl border border-zinc-200/50 bg-white/45 backdrop-blur-sm p-3 shadow-[0_15px_45px_rgba(0,0,0,0.05)] will-change-[transform,border-radius] overflow-hidden flex items-center justify-center mt-6"
        >
          <Image 
            src="/floating_cards_hero.png" 
            alt="Floating glassmorphic debit cards showing split flow streams"
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover rounded-2xl select-none pointer-events-none"
          />

          {/* Reveal Overlay (Fades in as zoom completes) */}
          <div 
            ref={overlayRef} 
            className="card-overlay-reveal absolute inset-0 bg-[#09090B]/95 z-30 flex flex-col justify-center items-center p-6 text-center opacity-0 scale-95 will-change-[transform,opacity] pointer-events-none"
          >
            <div className="w-12 h-12 rounded-full bg-[#635BFF]/10 flex items-center justify-center border border-[#635BFF]/30 mb-4 animate-pulse">
              <svg className="w-6 h-6 text-[#635BFF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white">Active Split Routing Engine</h3>
            <p className="text-small text-zinc-400 mt-2 max-w-xs leading-relaxed">
              Scroll down to configure ledgers, set split rules, and test transactions.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
