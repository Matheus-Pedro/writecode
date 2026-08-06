import { useMemo } from "react";
import { tokenizeCode, tokenColor } from "../syntax-highlight";
import { cn } from "../lib/utils";

interface Run {
  text: string;
  color?: string;
}

function buildRuns(language: string, value: string): Run[] {
  const tokens = tokenizeCode(language, value);
  const out: Run[] = [];
  let i = 0;
  while (i < value.length) {
    const color = tokenColor(tokens[i]);
    let j = i + 1;
    while (j < value.length && tokenColor(tokens[j]) === color) j++;
    out.push({ text: value.slice(i, j), color });
    i = j;
  }
  return out;
}

export function CodeEditor({
  language = "",
  value,
  onChange,
  ariaLabel,
  className,
}: {
  language?: string;
  value: string;
  onChange: (v: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const runs: Run[] = useMemo(() => buildRuns(language, value), [language, value]);

  return (
    <div
      className={cn(
        "scroll-slim relative w-full overflow-hidden rounded-md border border-white/10 bg-ink-950/70",
        className
      )}
    >
      <pre
        aria-hidden
        className="pointer-events-none m-0 whitespace-pre-wrap break-words p-3.5 font-mono text-[13px] leading-relaxed text-zinc-200"
      >
        {runs.map((r, i) => (
          <span key={i} style={r.color ? { color: r.color } : undefined}>
            {r.text}
          </span>
        ))}
      </pre>
      <textarea
        value={value}
        aria-label={ariaLabel}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className="absolute inset-0 block h-full w-full resize-none border-0 bg-transparent p-3.5 font-mono text-[13px] leading-relaxed text-transparent caret-zinc-100 focus-visible:outline-none"
      />
    </div>
  );
}