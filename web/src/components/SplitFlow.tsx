"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  motion,
  useReducedMotion,
  AnimatePresence,
  useMotionValue,
  animate,
} from "framer-motion";
import { CreditCard, Smartphone, ArrowLeftRight, CheckCircle2, Nfc } from "lucide-react";
import type { BucketWithActivity } from "@/types";
import { formatNaira, formatRule } from "@/lib/format";
import { getBucketConfig } from "@/lib/buckets";
import {
  ANIMATION_QUEUE_GAP_MS,
  getFlowColor,
  particleCountForAmount,
  type StreamTransaction,
  type StreamSplit,
} from "@/lib/splitFlow";
import {
  approximatePathLength,
  buildFlowPath,
  cubicPoint,
  type Point,
} from "@/lib/bezier";
import { useTransactionStream } from "@/hooks/useTransactionStream";
import { mutate } from "swr";

const T_COUNT = 200;
const T_PATHS = 400;
const T_PARTICLES = 700;
const T_END = 2200;
const PATH_DRAW_MS = 350;
const PATH_STAGGER_MS = 80;
const PARTICLE_TRAVEL_MS = 900;
const PARTICLE_SPAWN_MS = 60;

interface PathGeom {
  key: string;
  d: string;
  length: number;
  p0: Point;
  p1: Point;
  p2: Point;
  p3: Point;
  color: string;
  split: StreamSplit;
}

interface Particle {
  id: number;
  pathKey: string;
  progress: number;
  speed: number;
  scale: number;
  value: number;
}

interface SplitFlowProps {
  merchantId: string;
  buckets: BucketWithActivity[];
}

function channelIcon(channel: StreamTransaction["channel"]) {
  if (channel === "tap_and_pay") return Nfc;
  if (channel === "card") return CreditCard;
  if (channel === "ussd") return Smartphone;
  return ArrowLeftRight;
}

function useAnimationQueue(onDequeue: (tx: StreamTransaction) => void) {
  const queueRef = useRef<StreamTransaction[]>([]);
  const busyRef = useRef(false);

  const pump = useCallback(() => {
    if (busyRef.current || queueRef.current.length === 0) return;
    busyRef.current = true;
    const next = queueRef.current.shift()!;
    onDequeue(next);
  }, [onDequeue]);

  const enqueue = useCallback(
    (tx: StreamTransaction) => {
      queueRef.current.push(tx);
      pump();
    },
    [pump],
  );

  const complete = useCallback(() => {
    busyRef.current = false;
    setTimeout(pump, ANIMATION_QUEUE_GAP_MS);
  }, [pump]);

  return { enqueue, complete };
}

export function SplitFlow({ merchantId, buckets }: SplitFlowProps) {
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<StreamTransaction | null>(null);
  const [visible, setVisible] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [paths, setPaths] = useState<PathGeom[]>([]);
  const [pathDraw, setPathDraw] = useState<Record<string, number>>({});
  const [pathsVisible, setPathsVisible] = useState(true);
  const [bucketDisplay, setBucketDisplay] = useState<Record<string, number>>({});
  const [bucketPulse, setBucketPulse] = useState<Record<string, boolean>>({});
  const [depositFlash, setDepositFlash] = useState<Record<string, boolean>>({});
  const [cardVisible, setCardVisible] = useState(false);
  const [animStart, setAnimStart] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const bucketRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleIdRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const spawnedRef = useRef<Record<string, number>>({});
  const deliveredRef = useRef<Record<string, number>>({});
  const rafRef = useRef<number>(0);
  const amountMotion = useMotionValue(0);
  const [displayAmount, setDisplayAmount] = useState(0);

  const bucketBalanceMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const b of buckets) {
      map[b.id] = parseFloat(b.balance);
    }
    return map;
  }, [buckets]);

  const startAnimation = useCallback(
    (tx: StreamTransaction) => {
      setActive(tx);
      setVisible(true);
      setToast(null);
      setPaths([]);
      setPathDraw({});
      setPathsVisible(true);
      particlesRef.current = [];
      setDepositFlash({});
      setBucketPulse({});
      spawnedRef.current = {};
      deliveredRef.current = {};

      const initial: Record<string, number> = {};
      for (const split of tx.splits) {
        if (split.bucketId) {
          initial[split.bucketId] = bucketBalanceMap[split.bucketId] ?? 0;
        }
      }
      setBucketDisplay(initial);
      setCardVisible(true);
      setAnimStart(performance.now());
      amountMotion.set(0);
      setDisplayAmount(0);
    },
    [amountMotion, bucketBalanceMap],
  );

  const { enqueue, complete } = useAnimationQueue(startAnimation);

  useTransactionStream(merchantId, enqueue);

  const finishAnimation = useCallback(
    (tx: StreamTransaction) => {
      const streamCount = tx.splits.filter(
        (s) => parseFloat(s.amountNaira) > 0,
      ).length;
      const total = parseFloat(tx.amountNaira);
      setToast(
        `₦${total.toLocaleString("en-NG")} split across ${streamCount} streams`,
      );
      void mutate(["buckets", merchantId]);
      void mutate(["transactions", merchantId]);

      setTimeout(() => {
        setVisible(false);
        setActive(null);
        setCardVisible(false);
        complete();
      }, 1200);

      setTimeout(() => setToast(null), 4000);
    },
    [complete, merchantId],
  );

  const measurePaths = useCallback(() => {
    if (!active || !containerRef.current || !sourceRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const sourceRect = sourceRef.current.getBoundingClientRect();
    const from: Point = {
      x: sourceRect.left + sourceRect.width / 2 - containerRect.left,
      y: sourceRect.bottom - containerRect.top,
    };

    const nextPaths: PathGeom[] = [];

    active.splits.forEach((split, index) => {
      const amount = parseFloat(split.amountNaira);
      if (amount <= 0) return;

      const key = split.bucketId ?? `op-${index}`;
      const el = split.bucketId ? bucketRefs.current.get(split.bucketId) : null;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const to: Point = {
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top,
      };

      const { d, p0, p1, p2, p3 } = buildFlowPath(from, to);
      nextPaths.push({
        key,
        d,
        length: approximatePathLength(p0, p1, p2, p3),
        p0,
        p1,
        p2,
        p3,
        color: getFlowColor(split.bucketType),
        split,
      });
    });

    setPaths(nextPaths);
  }, [active]);

  useLayoutEffect(() => {
    if (!active || !visible) return;
    const id = requestAnimationFrame(measurePaths);
    const retry = window.setTimeout(measurePaths, 50);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(retry);
    };
  }, [active, visible, measurePaths, active?.splits.length]);

  useEffect(() => {
    if (!active || reducedMotion) return;

    const unsub = amountMotion.on("change", (v) => setDisplayAmount(v));
    const tCount = window.setTimeout(() => {
      animate(amountMotion, parseFloat(active.amountNaira), {
        duration: 0.5,
        ease: "easeOut",
      });
    }, T_COUNT);

    return () => {
      unsub();
      clearTimeout(tCount);
    };
  }, [active, amountMotion, reducedMotion]);

  useEffect(() => {
    if (!active || reducedMotion) return;

    const timers: number[] = [];

    paths.forEach((path, i) => {
      timers.push(
        window.setTimeout(() => {
          const start = performance.now();
          const tick = () => {
            const elapsed = performance.now() - start;
            const progress = Math.min(1, elapsed / PATH_DRAW_MS);
            setPathDraw((prev) => ({ ...prev, [path.key]: progress }));
            if (progress < 1) requestAnimationFrame(tick);
          };
          tick();
        }, T_PATHS + i * PATH_STAGGER_MS),
      );
    });

    return () => timers.forEach(clearTimeout);
  }, [active, paths, reducedMotion]);

  useEffect(() => {
    if (!active) return;

    if (reducedMotion) {
      const final: Record<string, number> = {};
      for (const split of active.splits) {
        if (!split.bucketId) continue;
        const base = bucketBalanceMap[split.bucketId] ?? 0;
        final[split.bucketId] = base + parseFloat(split.amountNaira);
      }
      const t = window.setTimeout(() => setBucketDisplay(final), 50);
      const done = window.setTimeout(() => finishAnimation(active), 400);
      return () => {
        clearTimeout(t);
        clearTimeout(done);
      };
    }

    const spawnInterval = window.setInterval(() => {
      const elapsed = performance.now() - animStart;
      if (elapsed < T_PARTICLES) return;

      for (const path of paths) {
        const total = parseFloat(path.split.amountNaira);
        const maxParticles = particleCountForAmount(total);
        const spawned = spawnedRef.current[path.key] ?? 0;
        if (spawned >= maxParticles) continue;

        const value = total / maxParticles;
        spawnedRef.current[path.key] = spawned + 1;
        particlesRef.current.push({
          id: particleIdRef.current++,
          pathKey: path.key,
          progress: 0,
          speed: 1 / PARTICLE_TRAVEL_MS,
          scale: 0.8 + Math.random() * 0.3,
          value,
        });
      }
    }, PARTICLE_SPAWN_MS);

    const fadePaths = window.setTimeout(() => setPathsVisible(false), T_END - 300);
    const hideCard = window.setTimeout(() => setCardVisible(false), T_END);
    const done = window.setTimeout(() => finishAnimation(active), T_END + 400);

    return () => {
      clearInterval(spawnInterval);
      clearTimeout(fadePaths);
      clearTimeout(hideCard);
      clearTimeout(done);
    };
  }, [active, animStart, paths, reducedMotion, bucketBalanceMap, finishAnimation]);

  useEffect(() => {
    if (!active || reducedMotion || paths.length === 0) return;

    const pathMap = new Map(paths.map((p) => [p.key, p]));

    const loop = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
        canvas.style.width = `${w}px`;
        canvas.style.height = `${h}px`;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const remaining: Particle[] = [];

      for (const p of particlesRef.current) {
        const path = pathMap.get(p.pathKey);
        if (!path) continue;

        const speedJitter = p.speed * (0.9 + Math.random() * 0.2);
        const nextProgress = p.progress + speedJitter * 16;

        if (nextProgress >= 1) {
          const bucketId = path.split.bucketId;
          if (bucketId) {
            deliveredRef.current[bucketId] =
              (deliveredRef.current[bucketId] ?? 0) + p.value;
            setBucketDisplay((b) => ({
              ...b,
              [bucketId]:
                (bucketBalanceMap[bucketId] ?? 0) +
                (deliveredRef.current[bucketId] ?? 0),
            }));
            setBucketPulse((b) => ({ ...b, [bucketId]: true }));
            setDepositFlash((b) => ({ ...b, [bucketId]: true }));
            setTimeout(() => {
              setBucketPulse((b) => ({ ...b, [bucketId]: false }));
              setDepositFlash((b) => ({ ...b, [bucketId]: false }));
            }, 200);
          }
          continue;
        }

        const pt = cubicPoint(nextProgress, path.p0, path.p1, path.p2, path.p3);

        let opacity = 1;
        if (nextProgress < 0.08) opacity = nextProgress / 0.08;
        if (nextProgress > 0.9) opacity = (1 - nextProgress) / 0.1;

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = path.color;
        ctx.font = `bold ${12 * p.scale}px "Space Grotesk", sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("₦", pt.x, pt.y);
        ctx.restore();

        remaining.push({ ...p, progress: nextProgress });
      }

      particlesRef.current = remaining;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, paths, reducedMotion, bucketBalanceMap]);

  const activeSplits = active?.splits.filter((s) => parseFloat(s.amountNaira) > 0) ?? [];
  const ChannelIcon = active ? channelIcon(active.channel) : ArrowLeftRight;

  return (
    <>
      <AnimatePresence>
        {visible && active && (
          <motion.section
            key={active.transactionId}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-8 overflow-hidden"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-forest/70">
                Live split
              </h2>
              <span className="text-xs text-muted-foreground">
                Queued animations run one at a time (+{ANIMATION_QUEUE_GAP_MS}ms gap)
              </span>
            </div>

            <div ref={containerRef} className="relative rounded-3xl bg-cream-dark/50 p-4 sm:p-6">
              <AnimatePresence>
                {cardVisible && (
                  <motion.div
                    ref={sourceRef}
                    initial={{ opacity: 0, scale: 0.95, y: -12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative mx-auto mb-4 max-w-md rounded-2xl bg-white p-5 shadow-card"
                    style={{
                      boxShadow: "0 0 40px -8px rgba(212, 162, 76, 0.45)",
                    }}
                  >
                    <motion.div
                      className="pointer-events-none absolute inset-0 rounded-2xl"
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        boxShadow: "inset 0 0 24px rgba(212, 162, 76, 0.15)",
                      }}
                    />
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                            Incoming payment
                          </p>
                          {active.channel === "tap_and_pay" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gold">
                              <Nfc className="h-3 w-3" />
                              Tap & Pay
                            </span>
                          )}
                        </div>
                        <p className="mt-1 font-medium text-forest">
                          {active.customerName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(active.receivedAt).toLocaleTimeString("en-NG", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold/15">
                        <ChannelIcon className="h-5 w-5 text-gold" />
                      </div>
                    </div>
                    <p className="mt-4 font-display text-3xl font-semibold text-forest">
                      {formatNaira(reducedMotion ? parseFloat(active.amountNaira) : displayAmount)}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative h-36 sm:h-44">
                {!reducedMotion && (
                  <>
                    <svg className="absolute inset-0 h-full w-full overflow-visible">
                      {paths.map((path) => {
                        const progress = pathDraw[path.key] ?? 0;
                        const offset = path.length * (1 - progress);
                        return (
                          <motion.path
                            key={path.key}
                            d={path.d}
                            fill="none"
                            stroke={path.color}
                            strokeOpacity={pathsVisible ? 0.6 : 0}
                            strokeWidth={2.5}
                            strokeLinecap="round"
                            strokeDasharray={path.length}
                            strokeDashoffset={offset}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: pathsVisible ? 1 : 0 }}
                            transition={{ duration: 0.3 }}
                            style={{
                              filter: `drop-shadow(0 0 6px ${path.color}40)`,
                            }}
                          />
                        );
                      })}
                    </svg>
                    <canvas
                      ref={canvasRef}
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    />
                  </>
                )}
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2 pt-2">
                {activeSplits.map((split, index) => {
                  const key = split.bucketId ?? `op-${index}`;
                  const config = getBucketConfig(split.bucketType);
                  const Icon = config.icon;
                  const color = getFlowColor(split.bucketType);
                  const balance =
                    split.bucketId && bucketDisplay[split.bucketId] !== undefined
                      ? bucketDisplay[split.bucketId]
                      : bucketBalanceMap[split.bucketId ?? ""] ?? 0;
                  const bucket = buckets.find((b) => b.id === split.bucketId);
                  const rule = bucket?.rule ?? split.rule;

                  return (
                    <motion.div
                      key={key}
                      ref={(el) => {
                        if (el && split.bucketId) {
                          bucketRefs.current.set(split.bucketId, el);
                        }
                      }}
                      animate={{
                        scale: split.bucketId && bucketPulse[split.bucketId] ? [1, 1.04, 1] : 1,
                      }}
                      transition={{ duration: 0.2 }}
                      className="relative min-w-[160px] flex-1 rounded-2xl bg-white p-4 shadow-card"
                    >
                      {split.bucketId && depositFlash[split.bucketId] && (
                        <motion.div
                          className="absolute inset-x-4 top-0 h-1 rounded-full"
                          initial={{ opacity: 0.9, scaleX: 0.2 }}
                          animate={{ opacity: 0, scaleX: 1 }}
                          transition={{ duration: 0.35 }}
                          style={{ backgroundColor: color }}
                        />
                      )}
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}18` }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium text-forest">
                            {split.bucketName}
                          </p>
                          {rule && (
                            <span
                              className="text-[10px] font-medium"
                              style={{ color }}
                            >
                              {formatRule(rule as { kind: "PERCENTAGE" | "FIXED" | "WEEKLY_FIXED"; value: number })}
                            </span>
                          )}
                        </div>
                      </div>
                      <p
                        className="mt-2 font-display text-lg font-semibold"
                        style={{ color }}
                      >
                        +{formatNaira(split.amountNaira)}
                      </p>
                      {split.bucketId && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          → {formatNaira(balance)}
                        </p>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16, x: 16 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-forest px-4 py-3 text-sm text-cream shadow-card"
          >
            <CheckCircle2 className="h-4 w-4 text-gold" />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
