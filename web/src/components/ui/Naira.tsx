import { cn } from "@/lib/utils";

function formatAmount(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "0.00";
  return num.toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface NairaProps {
  amount: string | number;
  prefix?: "+" | "-" | "";
  subdued?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-small",
  md: "text-base",
  lg: "text-3xl",
  xl: "text-display",
};

export function Naira({
  amount,
  prefix = "",
  subdued = false,
  className,
  size = "md",
}: NairaProps) {
  const prefixColor =
    prefix === "+"
      ? "text-success"
      : prefix === "-"
        ? "text-danger"
        : undefined;

  return (
    <span className={cn("tabular inline-flex items-baseline gap-0.5", className)}>
      {prefix && (
        <span className={cn("font-medium", prefixColor ?? "text-ink-tertiary")}>
          {prefix}
        </span>
      )}
      <span className="text-ink-tertiary opacity-80">₦</span>
      <span
        className={cn(
          "tabular font-medium",
          sizeClasses[size],
          subdued ? "text-ink-secondary" : "text-ink-primary",
        )}
      >
        {formatAmount(amount)}
      </span>
    </span>
  );
}
