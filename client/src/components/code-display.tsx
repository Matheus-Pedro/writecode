import type { RefObject } from "react";
import { cn } from "../lib/utils";

interface Cell {
  i: number;
  target: string;
  typed: string | undefined;
  state: "pending" | "correct" | "wrong";
  isNewline: boolean;
}

interface Row {
  lineNumber: number;
  cells: Cell[];
}

function makeCell(i: number, targetChar: string, typed: string[]): Cell {
  const t = typed[i];
  return {
    i,
    target: targetChar,
    typed: t,
    state: t === undefined ? "pending" : t === targetChar ? "correct" : "wrong",
    isNewline: targetChar === "\n",
  };
}

function buildModel(target: string, typed: string[]): Row[] {
  const lines = target.split("\n");
  const model: Row[] = [];
  let idx = 0;
  for (let li = 0; li < lines.length; li++) {
    const cells: Cell[] = [];
    for (const ch of lines[li]) cells.push(makeCell(idx++, ch, typed));
    if (li < lines.length - 1) cells.push(makeCell(idx++, "\n", typed));
    model.push({ lineNumber: li + 1, cells });
  }
  return model;
}

function displayChar(c: Cell): string {
  if (c.state === "wrong") return c.typed ?? "·";
  const ch = c.target;
  if (ch === " ") return "·";
  if (ch === "\n") return "↩";
  return ch;
}

export function CodeDisplay({
  target,
  typed,
  caretRef,
  selected,
}: {
  target: string;
  typed: string[];
  caretRef?: RefObject<HTMLSpanElement | null>;
  selected?: boolean;
}) {
  const model = buildModel(target, typed);
  const caretIndex = selected ? -1 : typed.length;

  return (
    <pre className="scroll-slim max-h-[56vh] overflow-auto px-5 py-5 font-mono text-[14px] leading-[1.7]">
      {model.map((row, ri) => (
        <div key={ri} className="flex whitespace-pre">
          <span
            aria-hidden
            className="w-10 shrink-0 select-none pr-4 text-right text-[12px] text-zinc-700"
          >
            {row.lineNumber}
          </span>
          <span className="flex-1">
            {row.cells.map((c, ci) => {
              const isCaret = c.i === caretIndex;
              return (
                <span
                  key={ci}
                  ref={isCaret ? caretRef : undefined}
                  className={cn(
                    "code-cell",
                    isCaret
                      ? "caret"
                      : c.state === "wrong"
                        ? "wrong"
                        : c.state === "correct"
                          ? "correct"
                          : "pending",
                    c.isNewline && "newline",
                    selected && c.state === "correct" && "selected"
                  )}
                >
                  {displayChar(c)}
                </span>
              );
            })}
          </span>
        </div>
      ))}
    </pre>
  );
}
