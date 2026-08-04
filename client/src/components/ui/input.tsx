import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "flex h-9 w-full rounded-sm border border-white/10 bg-white/[0.02] px-3 text-sm text-zinc-100 font-mono",
        "placeholder:text-zinc-600 transition-colors duration-150",
        "focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-1 focus-visible:ring-accent/40",
        "hover:border-white/[0.16]",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
