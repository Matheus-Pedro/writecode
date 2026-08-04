import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap select-none font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-zinc-100 text-ink-950 hover:bg-white shadow-[0_1px_0_rgba(255,255,255,0.1)_inset]",
        secondary:
          "border border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.07] hover:border-white/[0.16]",
        ghost: "text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.05]",
        icon: "size-8 text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]",
      },
      size: {
        sm: "h-8 px-3 text-[13px] rounded-sm",
        md: "h-9 px-4 text-sm rounded-md",
        lg: "h-10 px-5 text-sm rounded-md",
        icon: "size-8 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
