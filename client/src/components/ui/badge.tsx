import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium tracking-tight",
  {
    variants: {
      variant: {
        subtle: "border border-white/[0.08] bg-white/[0.04] text-zinc-300",
        accent: "bg-accent-soft text-accent-hover",
        neutral: "bg-white/[0.03] text-zinc-500",
        success: "bg-emerald-500/10 text-emerald-400",
      },
    },
    defaultVariants: {
      variant: "subtle",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
