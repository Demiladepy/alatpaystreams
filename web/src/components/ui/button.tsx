import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-accent text-white text-small rounded-md hover:bg-accent-hover",
        secondary:
          "bg-white text-ink-primary text-small border border-border rounded-md hover:bg-surface",
        outline:
          "bg-white text-ink-primary text-small border border-border rounded-md hover:bg-surface",
        ghost: "text-ink-secondary text-small rounded-md hover:bg-surface",
        danger:
          "bg-danger text-white text-small rounded-md hover:bg-danger/90",
      },
      size: {
        xs: "h-7 px-3 text-micro rounded-md",
        sm: "h-8 px-3 text-small rounded-md",
        default: "h-9 px-4 text-small rounded-md",
        lg: "h-10 px-5 text-small rounded-md",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
