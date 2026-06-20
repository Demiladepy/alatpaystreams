import { cn } from "@/lib/utils";

type StatusVariant = "success" | "warning" | "danger" | "neutral";

const dotColors: Record<StatusVariant, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink-quaternary",
};

interface StatusDotProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
}

export function StatusDot({ label, variant = "success", className }: StatusDotProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[variant])} />
      <span className="text-small text-ink-secondary">{label}</span>
    </span>
  );
}
