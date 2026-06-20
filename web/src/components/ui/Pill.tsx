import { cn } from "@/lib/utils";

interface PillProps {
  children: React.ReactNode;
  variant?: "accent" | "neutral" | "success" | "warning" | "danger";
  className?: string;
}

const variants = {
  accent: "bg-accent-subtle text-accent",
  neutral: "bg-surface text-ink-tertiary",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
};

export function Pill({ children, variant = "accent", className }: PillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1 py-0.5 text-micro font-medium",
        variants[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
