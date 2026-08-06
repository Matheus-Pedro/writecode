import { cn } from "../../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-white/[0.05]", className)} />
  );
}

export function SkeletonRow({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3.5 rounded-md border border-white/[0.05] bg-white/[0.02] px-4 py-3.5",
        className
      )}
    >
      <Skeleton className="size-8 rounded-[5px]" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton className="h-3 w-8" />
      </div>
    </div>
  );
}