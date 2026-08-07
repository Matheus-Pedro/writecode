import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LANGUAGES } from "../languages";
import { buildStats, formatTime, type Stats } from "../stats";
import { CodeDisplay } from "./code-display";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ChevronLeft, Restart, Shuffle } from "./icons";
import { cn } from "../lib/utils";
import type { SnippetData } from "../api";
import { session, resetSession, saveGhostTime } from "../session";

interface Props {
  language: string;
  snippet: SnippetData;
  onFinish: (stats: Stats) => void;
  onChangeLanguage: () => void;
  onNewSnippet: () => void;
  survival?: boolean;
}

export function TypingScreen({ language, snippet, onFinish, onChangeLanguage, onNewSnippet, survival }: Props) {
  const target = snippet.code;
  const [typed, setTyped] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [selected, setSelected] = useState(false);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const lang = LANGUAGES[language];
  const backRef = useRef(0);
  const lastPushRef = useRef(0);

  useEffect(() => {
    session.snippetKey = `${snippet.source}::${snippet.path || ""}`;
    session.linesTyped = snippet.code.split("\n").length;
  }, [snippet]);

  useEffect(() => {
    resetSession();
    return () => {
      if (doneRef.current) saveGhostTime(target.length, (performance.now() - (startRef.current || performance.now())) / 1000);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (doneRef.current) return;

      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setSelected((s) => !s);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "Backspace") {
        e.preventDefault();
        backRef.current += 1;
        setTyped((t) => t.slice(0, -1));
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        if (startRef.current === null) startRef.current = performance.now();
        setTyped((t) => {
          if (t.length >= target.length) return t;
          let spaces = 0;
          while (
            t.length + spaces < target.length &&
            (target[t.length + spaces] === " " || target[t.length + spaces] === "\t")
          ) {
            spaces++;
          }
          if (spaces === 0) return t;
          return [...t, ...target.slice(t.length, t.length + spaces)];
        });
        return;
      }

      let ch: string | null = null;
      if (e.key === "Enter") ch = "\n";
      else if (e.key.length === 1) ch = e.key;
      else return;

      e.preventDefault();
      if (startRef.current === null) startRef.current = performance.now();
      setTyped((t) => {
        if (t.length >= target.length) return t;
        return [...t, ch!];
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target.length]);

  useEffect(() => {
    const id = setInterval(() => {
      if (startRef.current !== null && !doneRef.current) {
        setElapsed((performance.now() - startRef.current) / 1000);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (typed.length >= target.length && !doneRef.current && startRef.current !== null) {
      doneRef.current = true;
      const secs = (performance.now() - startRef.current) / 1000;
      setElapsed(secs);
      onFinish(buildStats(typed, target, secs));
    } else if (survival && typed.length > 0 && startRef.current !== null && !doneRef.current) {
      let wrong = 0;
      for (let i = 0; i < typed.length; i++) if (typed[i] !== target[i]) wrong++;
      if (wrong > 0) {
        doneRef.current = true;
        const secs = (performance.now() - startRef.current) / 1000;
        setElapsed(secs);
        onFinish(buildStats(typed, target, secs));
      }
    }
  }, [typed, target, onFinish, survival]);

  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [typed.length]);

  useEffect(() => {
    if (startRef.current === null || doneRef.current) return;
    const now = (performance.now() - startRef.current) / 1000;
    if (now - lastPushRef.current < 0.1) return;
    lastPushRef.current = now;
    const s = buildStats(typed, target, now);
    session.frames.push({ t: now, chars: typed.length, errors: s.errors, wpm: s.wpm, backspaces: backRef.current });
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] !== target[i]) {
        const ch = typed[i] === "\n" ? "↵" : typed[i];
        session.wrongKeys[ch] = (session.wrongKeys[ch] || 0) + 1;
      }
    }
  }, [typed, target]);

  function reset() {
    doneRef.current = false;
    startRef.current = null;
    backRef.current = 0;
    setTyped([]);
    setElapsed(0);
    session.frames = [];
    session.wrongKeys = {};
  }

  const stats = buildStats(typed, target, elapsed);
  const progress = Math.min(100, (typed.length / target.length) * 100);
  const started = typed.length > 0;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5 pt-[9vh]">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Button variant="icon" onClick={onChangeLanguage} aria-label="Trocar linguagem">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.02] px-2.5 py-1">
            <span className="font-mono text-[11px] font-semibold text-zinc-300">{lang.glyph}</span>
            <span className="text-[12px] font-medium text-zinc-400">{lang.name}</span>
          </span>
        </div>

        <div className="order-last flex w-full items-stretch justify-center gap-0 sm:order-none sm:w-auto sm:flex-1">
          <div className="flex w-full divide-x divide-white/[0.06] overflow-hidden rounded-md border border-white/[0.06] bg-ink-900 sm:w-auto">
            <Stat label="PPM" value={formatNumber(stats.wpm)} accent />
            <Stat label="Precisão" value={`${(stats.accuracy * 100).toFixed(1)}%`} />
            <Stat label="Erros" value={String(stats.errors)} />
            <Stat label="Tempo" value={formatTime(elapsed)} />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="icon" onClick={reset} aria-label="Recomeçar">
            <Restart className="size-4" />
          </Button>
          <Button variant="icon" onClick={onNewSnippet} aria-label="Novo trecho">
            <Shuffle className="size-4" />
          </Button>
        </div>
      </div>

      <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
        <motion.div
          className="h-full bg-accent"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.15, ease: "linear" }}
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-2.5">
          <span className="truncate font-mono text-[11px] text-zinc-600">
            {snippet.source}
            {snippet.path ? ` / ${snippet.path}` : ""}
          </span>
          <span
            className={cn(
              "ml-4 shrink-0 font-mono text-[11px] transition-colors duration-300",
              started ? "text-zinc-500" : "text-zinc-700"
            )}
          >
            {started ? `${typed.length}/${target.length}` : "aguardando…"}
          </span>
        </div>
        <CodeDisplay target={target} typed={typed} caretRef={caretRef} selected={selected} />
      </Card>

      <div className="flex items-center justify-between text-[11px] text-zinc-600">
        <span>
          <span className="font-mono">↵</span> nova linha&nbsp;&nbsp;·&nbsp;&nbsp;
          <span className="font-mono">·</span> espaço&nbsp;&nbsp;·&nbsp;&nbsp;
          <span className="font-mono">⇥</span> 4 espaços&nbsp;&nbsp;·&nbsp;&nbsp;
          <span className="font-mono">⌫</span> backspace corrige
        </span>
        <span className="hidden sm:block">Caracteres vermelhos contam como erro</span>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center px-4 py-1.5">
      <span
        className={cn(
          "font-mono text-[15px] font-semibold tabular-nums",
          accent ? "text-accent-hover" : "text-zinc-100"
        )}
      >
        {value}
      </span>
      <span className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-zinc-600">
        {label}
      </span>
    </div>
  );
}

function formatNumber(n: number): string {
  return Number.isFinite(n) ? n.toFixed(0) : "0";
}
