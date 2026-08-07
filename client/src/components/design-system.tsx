import { motion } from "framer-motion";
import type { ReactNode, SVGProps } from "react";
import { Button } from "./ui/button";
import { ChevronLeft, Lock, Gauge, Crown, Shield, StarIcon, Droplet, Bolt, Rocket, Code, Layers, Calendar, Keyboard } from "./icons";
import { cn } from "../lib/utils";

/** Natural cubic-bezier shared across the app. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Standard screen entrance used by every page. */
export const screenMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE },
};

/** Shell width + vertical rhythm. */
export function PageShell({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("mx-auto flex w-full max-w-2xl flex-col pt-[4vh]", className)}>
      {children}
    </div>
  );
}

/** Top bar with a ghost back button. */
export function BackBar({ onBack, children }: { onBack: () => void; children?: ReactNode }) {
  return (
    <div className="mb-10 flex min-h-8 items-center justify-between">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
        <ChevronLeft className="size-4" />
        <span className="hidden sm:inline">Início</span>
      </Button>
      {children}
    </div>
  );
}

/** Small caps kicker above a title. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500", className)}>
      {children}
    </p>
  );
}

/** Big mono headline value + supporting caption. */
export function HeroMetric({
  value,
  unit,
  label,
  caption,
}: {
  value: ReactNode;
  unit?: ReactNode;
  label?: ReactNode;
  caption?: ReactNode;
}) {
  return (
    <motion.section {...screenMotion}>
      {label && <Eyebrow>{label}</Eyebrow>}
      <div className="mt-4 flex items-baseline gap-4">
        <span className="font-mono text-[56px] font-semibold leading-none tabular-nums tracking-tight text-zinc-50">
          {value}
          {unit && <span className="ml-1 text-[16px] font-medium text-zinc-600">{unit}</span>}
        </span>
      </div>
      {caption && <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-zinc-400">{caption}</p>}
    </motion.section>
  );
}

const screenOptions = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: EASE },
};

/** Section title + optional right-aligned meta. */
export function SectionHead({
  title,
  meta,
  caption,
  className,
}: {
  title: ReactNode;
  meta?: ReactNode;
  caption?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <div>
        <h2 className="text-[13px] font-semibold text-zinc-100">{title}</h2>
        {caption && <p className="mt-0.5 text-[12.5px] text-zinc-500">{caption}</p>}
      </div>
      {meta && <span className={cn("shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-600")}>{meta}</span>}
    </div>
  );
}

/** Thin hairline divider. */
export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/[0.06]", className)} />;
}

/** Row container with hairline separators. */
export function RowList({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex flex-col", className)}>{children}</div>;
}

export function Row({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0", className)}>
      {children}
    </div>
  );
}

/** Label + value list as a divided hairline strip (optical, no cards). */
export function MetricStrip({
  items,
  className,
}: {
  items: [label: string, value: ReactNode, opts?: { accent?: boolean }][];
  className?: string;
}) {
  return (
    <section className={cn("grid", className)} style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map(([label, value, opts], i) => {
        return (
          <div
            key={label}
            className={cn("flex flex-col gap-1 py-1.5", i > 0 && "border-l border-white/[0.08] pl-4", i === 0 && "pr-4")}
          >
            <span
              className={cn(
                "font-mono text-[22px] font-semibold leading-none tabular-nums",
                opts?.accent ? "text-accent" : "text-zinc-100"
              )}
            >
              {value}
            </span>
            <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-zinc-600">{label}</span>
          </div>
        );
      })}
    </section>
  );
}

/** Refined list skeleton (used on every data screen). */
export function SkeletonList({ rows = 7, icon = true }: { rows?: number; icon?: boolean }) {
  return (
    <div className="flex flex-col gap-4 pt-2">
      <div className="flex items-end gap-4">
        <span className="h-16 w-24 animate-pulse rounded-md bg-white/[0.04]" />
        <span className="h-4 w-40 animate-pulse rounded-sm bg-white/[0.04]" />
      </div>
      <div className="mt-2 space-y-2.5">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            {icon && <span className="size-10 shrink-0 animate-pulse rounded-full bg-white/[0.04]" />}
            <div className="flex-1 space-y-1.5">
              <span className="block h-3.5 w-1/3 animate-pulse rounded-sm bg-white/[0.04]" />
              <span className="block h-3 w-2/5 animate-pulse rounded-sm bg-white/[0.04]" />
            </div>
            <span className="h-4 w-12 animate-pulse rounded-sm bg-white/[0.04]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Elegant centered empty state. */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <motion.div {...screenOptions} className="py-16 text-center">
      <p className="text-[14px] font-medium text-zinc-200">{title}</p>
      <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-500">{body}</p>
    </motion.div>
  );
}

/** Segmented control. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: ReactNode }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/[0.07] bg-ink-900 p-1">
      {options.map((o) => {
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={cn(
              "whitespace-nowrap rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors duration-150",
              active ? "bg-white/[0.08] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Achievement glyphs — shared by Achievements + Profile. */
type IconCmp = (props: SVGProps<SVGSVGElement>) => ReactNode;
const ACHIEVEMENT_ICON: Record<string, IconCmp> = {
  keyboard: Keyboard,
  "code": Code,
  gauge: Gauge,
  crown: Crown,
  "shield": Shield,
  star: StarIcon,
  drop: Droplet,
  bolt: Bolt,
  lightning: Bolt,
  rocket: Rocket,
  layers: Layers,
  calendar: Calendar,
};

export function AchievementGlyph({
  icon,
  locked,
  className,
}: {
  icon: string;
  locked?: boolean;
  className?: string;
}) {
  const I = ACHIEVEMENT_ICON[icon];
  if (locked || !I) return <Lock className={cn("size-4", className)} />;
  return <I className={cn("size-[18px]", className)} />;
}

/** Circular filled icon chip. */
export function IconChip({
  children,
  accent,
  className,
}: {
  children: ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full border",
        accent
          ? "border-accent/30 bg-accent-soft text-accent"
          : "border-white/[0.08] bg-white/[0.015] text-zinc-600",
        className
      )}
    >
      {children}
    </span>
  );
}