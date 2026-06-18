"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation } from "framer-motion";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  YAxis,
} from "recharts";
import type { BucketRule, BucketType } from "@/types";
import { formatNaira, formatRule } from "@/lib/format";
import { getBucketConfig } from "@/lib/buckets";
import { cn } from "@/lib/utils";

export interface BucketCardProps {
  name: string;
  type: BucketType;
  balance: string;
  rule: BucketRule;
  recentActivity: number[];
  className?: string;
}

export function BucketCard({
  name,
  type,
  balance,
  rule,
  recentActivity,
  className,
}: BucketCardProps) {
  const config = getBucketConfig(type);
  const Icon = config.icon;
  const controls = useAnimation();
  const prevBalance = useRef(balance);

  useEffect(() => {
    if (prevBalance.current !== balance) {
      controls.start({
        scale: [1, 1.03, 1],
        transition: { duration: 0.4, ease: "easeOut" },
      });
      prevBalance.current = balance;
    }
  }, [balance, controls]);

  const chartData = recentActivity.map((value, i) => ({
    day: i,
    amount: value,
  }));

  return (
    <motion.article
      className={cn(
        "group flex flex-col rounded-2xl bg-white p-5 shadow-card transition-shadow hover:shadow-card-hover",
        className,
      )}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${config.accent}18` }}
          >
            <Icon className="h-5 w-5" style={{ color: config.accent }} />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-forest">{name}</h3>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            backgroundColor: `${config.accent}14`,
            color: config.accent,
          }}
        >
          {formatRule(rule)}
        </span>
      </div>

      <motion.p
        animate={controls}
        className="font-display text-2xl font-semibold tracking-tight text-forest sm:text-3xl"
      >
        {formatNaira(balance)}
      </motion.p>

      <div className="mt-4 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <defs>
              <linearGradient id={`grad-${name.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.accent} stopOpacity={0.2} />
                <stop offset="100%" stopColor={config.accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="amount"
              stroke={config.accent}
              strokeWidth={1.5}
              fill={`url(#grad-${name.replace(/\s+/g, "-")})`}
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground">Last 7 days inflow</p>
    </motion.article>
  );
}
