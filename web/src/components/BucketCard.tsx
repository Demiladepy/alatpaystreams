"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import type { BucketRule } from "@/types";
import { formatRule } from "@/lib/format";
import { Naira } from "@/components/ui/Naira";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";

export interface BucketCardProps {
  name: string;
  balance: string;
  rule: BucketRule;
  recentActivity: number[];
  className?: string;
}

export function BucketCard({
  name,
  balance,
  rule,
  recentActivity,
  className,
}: BucketCardProps) {
  const [expanded, setExpanded] = useState(false);
  const controls = useAnimation();
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (prevBalance.current !== balance) {
      controls.start({
        scale: [1, 1.015, 1],
        transition: { duration: 0.15, ease: "easeOut" },
      });
      prevBalance.current = balance;
    }
  }, [balance, controls]);

  const todayInflow = recentActivity[recentActivity.length - 1] ?? 0;
  const recentTx = recentActivity
    .slice(-5)
    .reverse()
    .map((amount, i) => ({
      id: i,
      amount,
      label: i === 0 ? "Today" : `${i + 1}d ago`,
    }));

  return (
    <motion.article
      role="button"
      tabIndex={0}
      onClick={() => setExpanded((v) => !v)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setExpanded((v) => !v);
        }
      }}
      animate={controls}
      className={cn(
        "cursor-pointer rounded-md border border-border bg-white p-6 transition-colors hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-small font-medium uppercase tracking-wide text-ink-secondary">
          {name}
        </h3>
        <Pill>{formatRule(rule)}</Pill>
      </div>

      <div className="mt-6">
        <Naira amount={balance} size="lg" />
      </div>

      <p className="mt-4 text-mini text-ink-tertiary">
        {todayInflow > 0 && (
          <>
            <Naira amount={todayInflow} prefix="+" size="sm" className="inline" />
            {" today · "}
          </>
        )}
        7 days remaining
      </p>

      {expanded && (
        <ul className="mt-5 space-y-0 border-t border-border pt-4">
          {recentTx.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between border-b border-border py-2.5 last:border-0"
            >
              <span className="text-mini text-ink-tertiary">{tx.label}</span>
              <Naira amount={tx.amount} prefix="+" size="sm" subdued />
            </li>
          ))}
        </ul>
      )}
    </motion.article>
  );
}
