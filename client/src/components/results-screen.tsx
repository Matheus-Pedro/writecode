import { motion, type Variants } from "framer-motion";
import { rankLabel, formatTime, type Stats } from "../stats";
import { LANGUAGES } from "../languages";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Close, Restart, Shuffle } from "./icons";
import type { SnippetData } from "../api";

const ease = [0.16, 1, 0.3, 1] as const;

const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease } },
};

export function ResultsScreen({
  language,
  snippet,
  stats,
  onRetry,
  onNewSnippet,
  onChangeLanguage,
}: {
  language: string;
  snippet: SnippetData;
  stats: Stats;
  onRetry: () => void;
  onNewSnippet: () => void;
  onChangeLanguage: () => void;
}) {
  const lang = LANGUAGES[language];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center pt-[12vh]">
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex w-full flex-col items-center"
      >
        <motion.div variants={item}>
          <Badge variant="accent">{rankLabel(stats.wpm)}</Badge>
        </motion.div>

        <motion.div variants={item} className="mt-6 flex flex-col items-center">
          <span className="font-mono text-[64px] font-semibold leading-none tabular-nums tracking-tight text-zinc-50">
            {stats.wpm.toFixed(0)}
          </span>
          <span className="mt-2 text-[12px] font-medium uppercase tracking-[0.12em] text-zinc-500">
            palavras por minuto
          </span>
        </motion.div>

        <motion.div variants={item} className="mt-3 text-[12px] text-zinc-600">
          {stats.total} caracteres · {formatTime(stats.elapsed)}
        </motion.div>

        <motion.div variants={item} className="mt-8 w-full">
          <Card className="grid grid-cols-2 overflow-hidden">
            <ResultCell value={`${(stats.accuracy * 100).toFixed(1)}%`} label="Precisão" border="border-b border-r" />
            <ResultCell value={`${stats.cpm.toFixed(0)}`} label="CPM" border="border-b" />
            <ResultCell value={String(stats.errors)} label="Erros" border="border-r" />
            <ResultCell value={formatTime(stats.elapsed)} label="Tempo" />
          </Card>
        </motion.div>

        <motion.div variants={item} className="mt-8 flex w-full flex-col gap-2.5">
          <Button variant="primary" size="lg" onClick={onRetry} className="w-full">
            <Restart className="size-4" />
            Repetir trecho
          </Button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={onNewSnippet} className="flex-1">
              <Shuffle className="size-4" />
              Novo trecho
            </Button>
            <Button variant="ghost" onClick={onChangeLanguage}>
              <Close className="size-4" />
              Linguagens
            </Button>
          </div>
        </motion.div>

        <motion.div variants={item} className="mt-8 flex items-center gap-2 text-[11px] text-zinc-600">
          <span className="flex size-5 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.02] font-mono text-[10px] font-semibold text-zinc-400">
            {lang.glyph}
          </span>
          {lang.name} · {snippet.source}
        </motion.div>
      </motion.div>
    </div>
  );
}

function ResultCell({ value, label, border }: { value: string; label: string; border?: string }) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-1 px-4 py-5 border-white/[0.05]",
        border ?? "",
      ].join(" ")}
    >
      <span className="font-mono text-[22px] font-semibold tabular-nums text-zinc-100">{value}</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">{label}</span>
    </div>
  );
}
