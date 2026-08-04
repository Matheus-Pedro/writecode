import * as React from "react";
import { cn } from "../../lib/utils";

function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-md border border-white/[0.06] bg-ink-900",
        className
      )}
      {...props}
    />
  );
}

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-sm bg-white/[0.06]", className)} {...props} />;
}

function Separator({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("h-px w-full bg-white/[0.06]", className)} role="separator" {...props} />
  );
}

export { Card, Skeleton, Separator };
