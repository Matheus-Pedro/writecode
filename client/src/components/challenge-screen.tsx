import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  fetchChallenge,
  runChallenge,
  type ChallengeDetail,
  type LevelInfo,
  type RunResult,
} from "../api.js";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { Check, ChevronLeft, Loader, Play, X } from "./icons.jsx";
import { CodeEditor } from "./code-editor.js";
import { LANGUAGE_LIST, LANGUAGES } from "../languages.js";
import { cn } from "../lib/utils.js";

const ease = [0.16, 1, 0.3, 1] as const;

const DIFF: Record<string, { label: string; variant: "success" | "subtle" | "accent" }> = {
  easy: { label: "Fácil", variant: "success" },
  medium: { label: "Médio", variant: "subtle" },
  hard: { label: "Difícil", variant: "accent" },
};

function langName(id: string) {
  return LANGUAGE_LIST.find((l) => l.id === id)?.name || id;
}

function renderValue(v: unknown): string {
  if (v === undefined) return "undefined";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

export function ChallengeScreen({
  id,
  initialLanguage,
  onBack,
  onSolved,
}: {
  id: string;
  initialLanguage?: string;
  onBack: () => void;
  onSolved: (xp: number, level: LevelInfo) => void;
}) {
  const [challenge, setChallenge] = useState<ChallengeDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState("");
  const [code, setCode] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  useEffect(() => {
    fetchChallenge(id)
      .then((r) => {
        setChallenge(r.challenge);
        setError(null);
      })
      .catch((e) => setError(e.message || "Não foi possível carregar o desafio."));
  }, [id]);

  useEffect(() => {
    if (challenge && !lang) {
      const fallback = challenge.languages[0];
      const picked =
        initialLanguage && challenge.languages.includes(initialLanguage)
          ? initialLanguage
          : fallback;
      setLang(picked);
      setCode(challenge.starters[picked] || "");
    }
  }, [challenge, lang, initialLanguage]);

  async function onRun() {
    if (!challenge) return;
    setRunning(true);
    setResult(null);
    try {
      const r = await runChallenge(challenge.id, { language: lang, code });
      setResult(r);
      if (r.solved && r.xpEarned > 0 && r.level) onSolved(r.xpEarned, r.level);
    } catch (e) {
      setResult({
        status: "error",
        passed: 0,
        total: 0,
        tests: [],
        xpEarned: 0,
        solved: false,
        level: null,
        detail: e instanceof Error ? e.message : "Falha ao executar.",
      });
    } finally {
      setRunning(false);
    }
  }

  if (error && !challenge) {
    return (
      <div className="mx-auto flex w-full max-w-shell flex-col gap-4 px-6 pt-8">
        <Button variant="icon" size="icon" aria-label="Voltar" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <p className="text-[13px] text-red-400">{error}</p>
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-zinc-500">
        <Loader className="size-4" />
        <span className="text-[13px]">Carregando desafio…</span>
      </div>
    );
  }

  const diff = DIFF[challenge.difficulty] || DIFF.easy;
  const passedAll = Boolean(
    result && result.status === "ok" && result.total > 0 && result.passed === result.total
  );

  return (
    <div className="mx-auto w-full max-w-shell px-6 pt-14 pb-24">
      <div className="mb-7 flex items-center gap-3">
        <Button variant="icon" size="icon" aria-label="Voltar" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            Desafio
          </span>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] font-semibold tracking-tight text-zinc-100">
              {challenge.title}
            </h1>
            <Badge variant={diff.variant}>{diff.label}</Badge>
            <Badge variant="accent">{challenge.xp} XP</Badge>
          </div>
        </div>
      </div>

      <p className="mb-4 whitespace-pre-line text-[13.5px] leading-7 text-zinc-400">
        {challenge.description}
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-[5px] border border-white/[0.06] bg-ink-800 font-mono text-[11px] font-semibold text-accent">
            {LANGUAGES[lang]?.glyph ?? lang.slice(0, 1).toUpperCase()}
          </span>
          <span className="text-[13px] font-medium text-zinc-200">{langName(lang)}</span>
        </div>
        <span aria-hidden className="hidden text-zinc-700 sm:inline">·</span>
        <p className="text-[12px] text-zinc-600">
          {challenge.testsCount} casos de teste — executados no servidor, em sandbox.
        </p>
      </div>

      <div className="overflow-hidden rounded-[9px] border border-white/[0.08] bg-ink-900/70 shadow-elevated">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[11px] font-semibold text-accent">{lang}</span>
            <span className="text-[12.5px] text-zinc-300">{langName(lang)}</span>
          </div>
          <span className="font-mono text-[11px] text-zinc-600">sandbox</span>
        </div>
        <CodeEditor
          language={lang}
          value={code}
          onChange={setCode}
          ariaLabel="Editor de código"
          className="min-h-[220px] rounded-none border-0 bg-transparent"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button variant="primary" size="md" disabled={running || !lang} onClick={onRun}>
          {running ? <Loader className="size-4" /> : <Play className="size-4" />}
          {running ? "Executando…" : "Rodar testes"}
        </Button>
        {passedAll && result?.solved && <Badge variant="success">+{result.xpEarned} XP</Badge>}
        {passedAll && !result?.solved && <Badge variant="success">Tudo certo ✓</Badge>}
      </div>

      {result && result.status === "ok" && <div className="mt-4"><ResultPanel result={result} /></div>}

      {result && result.status !== "ok" && (
        <div className="mt-4 rounded-[9px] border border-red-500/25 bg-red-500/5 p-4">
          <p className="mb-1.5 text-[13px] font-medium text-red-300">
            {result.status === "compile_error"
              ? "Erro de compilação"
              : result.status === "runtime_error"
                ? "Erro em tempo de execução"
                : "Falha ao executar"}
          </p>
          {result.detail && (
            <pre className="scroll-slim max-h-48 overflow-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-red-200/80">
              {result.detail}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}

function ResultPanel({ result }: { result: RunResult }) {
  const pct = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease }}
      className="overflow-hidden rounded-md border border-white/[0.08] bg-ink-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[15px] font-semibold text-zinc-100">
            {result.passed}/{result.total}
          </span>
          <span className="text-[12px] text-zinc-500">testes passaram</span>
        </div>
        <span
          className={cn(
            "font-mono text-[12px] tabular-nums",
            pct === 100 ? "text-emerald-400" : "text-zinc-400"
          )}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1 w-full bg-white/[0.05]">
        <div
          className="h-1 bg-gradient-to-r from-accent to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <ul className="scroll-slim max-h-56 divide-y divide-white/[0.04] overflow-auto">
        {result.tests.map((t, i) => (
          <li key={i} className="flex items-start gap-2.5 px-4 py-2 text-[12.5px]">
            {t.passed ? (
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
            ) : (
              <X className="mt-0.5 size-3.5 shrink-0 text-red-400" />
            )}
            <div className="min-w-0 flex-1">
              <span className={cn("font-medium", t.passed ? "text-emerald-300" : "text-zinc-300")}>
                Caso {i + 1}
              </span>
              {t.error && <span className="text-red-300"> — {renderValue(t.error)}</span>}
              {!t.passed && !t.error && (
                <span className="text-zinc-400">
                  {" "}
                  — arg={renderValue(t.input)} retornou{" "}
                  <span className="font-mono text-zinc-200">{renderValue(t.got)}</span>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}