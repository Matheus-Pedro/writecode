import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { getDailyState, dailyGuess, type DailyState, type DailyFeedback } from "../api";
import { Button } from "./ui/button";
import { Calendar, Copy, Sparkle } from "./icons";
import { PageShell, BackBar, Eyebrow, SectionHead, MetricStrip, EASE } from "./design-system";
import { cn } from "../lib/utils";

interface Props {
  user: { name: string | null } | null;
  onBack: () => void;
  onRequestLogin: () => void;
}

export function DailyScreen({ user, onBack, onRequestLogin }: Props) {
  return (
    <PageShell>
      <BackBar onBack={onBack} />
      <DailyGame user={user} onRequestLogin={onRequestLogin} />
    </PageShell>
  );
}

/* ---------- shared board pieces ---------- */

const TILE = "flex size-[clamp(2.5rem,11vw,2.75rem)] items-center justify-center rounded-[6px] border font-mono text-[1.35rem] font-semibold uppercase";

function Tile({ value, feedback }: { value: string; feedback: DailyFeedback }) {
  return (
    <motion.div
      initial={{ rotateX: -85, opacity: 0 }}
      animate={{ rotateX: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: EASE }}
      className={cn(
        TILE,
        feedback === "correct" && "border-emerald-300/40 bg-emerald-500 text-ink-950",
        feedback === "present" && "border-amber-200/40 bg-amber-400 text-ink-950",
        feedback === "absent" && "border-white/[0.05] bg-ink-700 text-zinc-600"
      )}
    >
      {value}
    </motion.div>
  );
}

function TileRow({ count, value, feedback }: { count: number; value: string; feedback: DailyFeedback[] }) {
  return (
    <div className="flex justify-center gap-1.5" style={{ perspective: 600 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Tile key={i} value={value[i] ?? ""} feedback={feedback[i]} />
      ))}
    </div>
  );
}

function EmptyRow({ count }: { count: number }) {
  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="size-[clamp(2.5rem,11vw,2.75rem)] rounded-[6px] border border-white/[0.05]" />
      ))}
    </div>
  );
}

function ActiveCells({
  count,
  cells,
  onChange,
  onSubmit,
  busy,
}: {
  count: number;
  cells: string[];
  onChange: (c: string[]) => void;
  onSubmit: (word: string) => void;
  busy: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const working = (): string[] => Array.from({ length: count }, (_, i) => cells[i] ?? "");

  const setAt = (i: number, v: string) => {
    const next = working();
    next[i] = v;
    onChange(next);
  };
  const focusSelect = (i: number) => {
    const el = refs.current[i];
    if (el) {
      el.focus();
      el.select();
    }
  };

  function handleKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (cells[i]) setAt(i, "");
      else if (i > 0) {
        setAt(i - 1, "");
        focusSelect(i - 1);
      }
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (busy) return;
      const word = cells.join("");
      if (word.length === count) onSubmit(word.toLowerCase());
      return;
    }
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusSelect(Math.max(0, i - 1));
      return;
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      focusSelect(Math.min(count - 1, i + 1));
      return;
    }
    if (/^[a-zA-Z]$/.test(e.key)) {
      e.preventDefault();
      setAt(i, e.key.toUpperCase());
      if (i < count - 1) focusSelect(i + 1);
    }
  }

  function handleChange(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    if (!v) {
      setAt(i, "");
      return;
    }
    setAt(i, v[v.length - 1].toUpperCase());
    if (i < count - 1) focusSelect(i + 1);
  }

  function handlePaste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const letters = (e.clipboardData.getData("text") || "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase()
      .split("");
    if (!letters.length) return;
    const next = working();
    let idx = i;
    for (const c of letters) {
      if (idx >= count) break;
      next[idx] = c;
      idx++;
    }
    onChange(next);
    focusSelect(Math.min(idx, count - 1));
  }

  return (
    <div className="flex justify-center gap-1.5">
      {Array.from({ length: count }).map((_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          value={cells[i] ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          maxLength={4}
          aria-label={`Letra ${i + 1}`}
          className={cn(
            TILE,
            "text-center transition-all duration-150",
            "focus:border-accent/70 focus:ring-2 focus:ring-accent/25 focus:outline-none",
            cells[i] ? "border-white/[0.22] bg-white/[0.05] text-zinc-50" : "border-white/[0.12] bg-white/[0.015]",
            "hover:border-white/[0.18] disabled:opacity-60"
          )}
          disabled={busy}
          autoFocus={i === 0}
        />
      ))}
    </div>
  );
}

function Hud({ total, at }: { total: number; at: number }) {
  return (
    <div className="flex items-center justify-between text-[12px] text-zinc-500">
      <span className="uppercase tracking-[0.12em] text-zinc-600">Tentativa</span>
      <span className="font-mono tabular-nums text-zinc-400">
        <span className="text-zinc-100">{Math.min(at, total)}</span>/{total}
      </span>
    </div>
  );
}

function ResultNote({
  solved,
  word,
  explanation,
  attempts,
  xp,
}: {
  solved: boolean;
  word: string | null;
  explanation: string | null;
  attempts: number;
  xp?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE }}
      className="flex flex-col items-center gap-1.5 text-center"
    >
      {solved ? (
        <>
          <p className="text-[15px] font-semibold text-emerald-400">
            Acertou em {attempts} {attempts === 1 ? "vez" : "tentativas"}
            {typeof xp === "number" && <span className="text-zinc-500"> · +{xp} XP</span>}
          </p>
          {word && explanation && (
            <p className="max-w-md text-[13px] leading-relaxed text-zinc-400">
              <span className="font-mono font-semibold text-zinc-200">{word}</span> — {explanation}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="text-[15px] font-semibold text-zinc-200">Fim de jogo.</p>
          <p className="max-w-md text-[13px] leading-relaxed text-zinc-500">
            {word ? (
              <>
                A palavra era: <span className="font-mono font-semibold text-zinc-300">{word}</span> — amanhã outra!
              </>
            ) : (
              "Não foi dessa vez. Tente de novo!"
            )}
          </p>
        </>
      )}
    </motion.div>
  );
}

/* ---------- login / loading states ---------- */
function Gate({ icon, title, onRequestLogin }: { icon: React.ReactNode; title: string; onRequestLogin: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <span className="text-accent">{icon}</span>
      <p className="text-[14px] text-zinc-300">{title}</p>
      <Button variant="primary" onClick={onRequestLogin}>
        Entrar
      </Button>
    </div>
  );
}

function BoardSkeleton({ count }: { count: number }) {
  const rows = Math.min(count + 1, 6);
  return (
    <div className="flex flex-col items-center gap-1.5 animate-pulse">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-1.5">
          {Array.from({ length: 5 }).map((_, c) => (
            <div key={c} className="size-[clamp(2.5rem,11vw,2.75rem)] rounded-[6px] bg-white/[0.04]" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ---------- Daily ---------- */

function DailyGame({
  user,
  onRequestLogin,
}: {
  user: { name: string | null } | null;
  onRequestLogin: () => void;
}) {
  const [state, setState] = useState<DailyState | null>(null);
  const [guesses, setGuesses] = useState<{ word: string; feedback: DailyFeedback[] }[]>([]);
  const [cells, setCells] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    getDailyState()
      .then((s) => {
        setState(s);
        if (s.attempts > 0 && s.feedback) setGuesses([{ word: "", feedback: s.feedback }]);
        if (s.wordLength) setCells(Array(s.wordLength).fill(""));
      })
      .catch(() => {});
  }, [user]);

  if (!user) return <Gate icon={<Calendar />} title="Faça login para jogar o desafio diário." onRequestLogin={onRequestLogin} />;
  if (!state)
    return (
      <div className="flex flex-col items-center gap-4 pt-6">
        <BoardSkeleton count={5} />
      </div>
    );

  const solved = state.solved;
  const over = state.attempts >= state.maxAttempts || solved;
  const count = state.wordLength;
  const dateKey = state.date;
  const maxAttempts = state.maxAttempts;

  async function submit(word: string) {
    setBusy(true);
    setError("");
    try {
      const s = await dailyGuess(word);
      setState(s);
      const fb = s.feedback;
      if (fb) setGuesses((g) => [...g, { word, feedback: fb }]);
      setCells(Array(count).fill(""));
      setCopied(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao enviar a tentativa.");
    } finally {
      setBusy(false);
    }
  }

  function buildShare() {
    const lines = guesses.map((g) =>
      g.feedback.map((f) => (f === "correct" ? "🟩" : f === "present" ? "🟨" : "⬛")).join("")
    );
    const acertos = guesses.filter((g) => g.feedback.every((f) => f === "correct")).length;
    return `CodeTerm #${dateKey.replace(/-/g, "")}\n\n${lines.join("\n")}\n\n${acertos}/${maxAttempts}`;
  }

  async function share() {
    try {
      await navigator.clipboard.writeText(buildShare());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  const attemptLabel = state.hintsRevealed > 0 && state.hintsShowing.length > 0;

  return (
    <div className="flex flex-col gap-8">
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <div className="flex items-center gap-2">
          <Eyebrow>{state.date}</Eyebrow>
          <span className="rounded-full border border-accent/25 bg-accent-soft px-2 py-0.5 text-[10.5px] font-medium text-accent">
            {state.categoryLabel}
          </span>
        </div>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Palavra do dia</h1>
        <p className="mt-1 text-[12.5px] text-zinc-500">
          <span className="font-mono tabular-nums">{count}</span> letras ·{" "}
          <span className="font-mono tabular-nums">{state.maxAttempts}</span> tentativas · todos jogam a mesma palavra
        </p>
      </motion.section>

      <MetricStrip
        items={[
          ["Streak", String(state.stats.currentStreak)],
          ["Melhor", String(state.stats.bestStreak)],
          ["Resolvidos", String(state.stats.totalSolved)],
          ["Acertos", `${(state.stats.accuracy * 100).toFixed(0)}%`],
          ["Média", state.stats.avgAttempts.toFixed(1)],
        ]}
      />

      {attemptLabel && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="flex flex-col gap-1.5 overflow-hidden border-l-2 border-accent/50 pl-4"
        >
          {state.hintsShowing.map((h, i) => (
            <div key={i} className="flex items-start gap-2 text-[12.5px] text-zinc-300">
              <Sparkle className="mt-0.5 size-3.5 shrink-0 text-accent" />
              <span>{h}</span>
            </div>
          ))}
        </motion.div>
      )}

      <div className="flex flex-col gap-1.5">
        <Board
          maxAttempts={state.maxAttempts}
          count={count}
          guesses={guesses}
          over={over}
          cells={cells}
          onChange={setCells}
          onSubmit={submit}
          busy={busy}
          attempt={state.attempts}
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12.5px] text-red-400">
          {error}
        </p>
      )}

      {over && (
        <div className="flex flex-col items-center gap-3">
          <ResultNote
            solved={solved}
            word={state.solvedWord}
            explanation={state.explanation}
            attempts={state.attempts}
            xp={state.xpEarned}
          />
          {solved && (
            <Button variant="secondary" onClick={share}>
              {copied ? <Sparkle className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copiado!" : "Compartilhar resultado"}
            </Button>
          )}
        </div>
      )}

      <section className="border-t border-white/[0.06] pt-8">
        <SectionHead
          title="Ranking diário"
          caption={
            state.ranking.length === 0 ? "Ninguém resolveu hoje ainda. Seja o primeiro!" : undefined
          }
        />
        <div className="mt-2 flex flex-col">
          {state.ranking.map((r) => (
            <div
              key={r.rank}
              className={cn(
                "flex items-center gap-3 border-b border-white/[0.05] py-2.5 last:border-b-0",
                r.isMe && "-mx-3 rounded-md bg-accent-soft/[0.06] px-3"
              )}
            >
              <span className="w-6 text-center font-mono text-[13px] tabular-nums text-zinc-500">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-200">
                {r.name}
                {r.isMe && <span className="ml-2 text-[10.5px] font-medium text-accent">você</span>}
              </span>
              <span className="shrink-0 font-mono text-[12px] text-zinc-500">
                {r.attempts} tent.
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* shared Board (used by daily + infinite) */
function Board({
  maxAttempts,
  count,
  guesses,
  over,
  cells,
  onChange,
  onSubmit,
  busy,
  attempt,
}: {
  maxAttempts: number;
  count: number;
  guesses: { word: string; feedback: DailyFeedback[] }[];
  over: boolean;
  cells: string[];
  onChange: (c: string[]) => void;
  onSubmit: (word: string) => void;
  busy: boolean;
  attempt: number;
}) {
  const activeRow = !over ? guesses.length : -1;
  return (
    <div className="flex flex-col gap-1.5">
      {Array.from({ length: maxAttempts }).map((_, ri) => {
        const guess = guesses[ri];
        if (ri === activeRow) {
          return (
            <div key={ri} className="flex flex-col gap-1.5">
              <Hud total={maxAttempts} at={attempt} />
              <ActiveCells count={count} cells={cells} onChange={onChange} onSubmit={onSubmit} busy={busy} />
            </div>
          );
        }
        if (guess) return <TileRow key={ri} count={count} value={guess.word} feedback={guess.feedback} />;
        return <EmptyRow key={ri} count={count} />;
      })}
    </div>
  );
}
