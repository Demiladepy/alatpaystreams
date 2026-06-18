import type { BucketRule } from "@/types";

export function formatNaira(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `₦${num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatNairaCompact(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num >= 1_000_000) {
    return `₦${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `₦${(num / 1_000).toFixed(0)}k`;
  }
  return formatNaira(num);
}

export function maskAccountId(id: string | null | undefined): string {
  if (!id) return "••••••••";
  if (id.length < 8) return "••••••••";
  return `${id.slice(0, 4)}••••${id.slice(-4)}`;
}

export function formatRule(rule: BucketRule): string {
  if (rule.kind === "PERCENTAGE") {
    return `${rule.value}%`;
  }
  if (rule.kind === "WEEKLY_FIXED") {
    return `${formatNairaCompact(rule.value)}/week`;
  }
  return formatNairaCompact(rule.value);
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
