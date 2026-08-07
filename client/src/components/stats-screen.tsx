import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LANGUAGES, deviconUrl } from "../languages";
import { getAdvancedStats, type LangStat } from "../api";
import { formatTime } from "../stats";
import { Button } from "./ui/button";
import { ChevronLeft } from "./icons";
import { cn } from "../lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

interface StatsData {
  unique: { totalRaces: number; bestWpm: number; bestAccuracy: number; languages: number };
  byLang: LangStat[];
}

export function StatsScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<StatsData | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAdvancedStats().then(setData).catch(() => setError(true));
  }, []);

  const byWpm = data
    ? [...data.byLang].sort((a, b) => b.avgWpm - a.avgWpm)
    : [];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pt-[4vh]">
      <div className="mb-10 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Início</span>
        </Button>
      </div>

      {error && (
        <p className="text-[13px] text-red-400">Falha ao carregar as estatísticas.</p>
      )}

      {!data && !error && (
        <div className="flex flex-col gap-3 pt-2">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-end gap-3"
          >
            <span className="block h-20 w-40 animate-pulse rounded-md bg-white/[0.04]" />
            <span className="block h-4 w-24 animate-pulse rounded-sm bg-white/[0.04]" />
          </motion.div>
          <div className="mt-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="size-5 animate-pulse rounded-md bg-white/[0.04]" />
                <span className="flex-1">
                  <span className="block h-3.5 w-1/3 animate-pulse rounded-sm bg-white/[0.04]" />
                  <span className="mt-2 block h-0.5 w-full animate-pulse bg-white/[0.04]" />
                </span>
                <span className="h-4 w-16 animate-pulse rounded-sm bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.unique.totalRaces === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
          className="py-16 text-center"
        >
          <p className="text-[14px] font-medium text-zinc-200">Ainda sem registro</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            Complete uma corrida de digitação para ver seu desempenho aqui.
          </p>
        </motion.div>
      )}

      {data && data.unique.totalRaces > 0 && (
        <div className="flex flex-col">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            title="Desempenho"
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Registro geral</p>
            <div className="mt-4 flex items-baseline gap-4">
              <span className="font-mono text-[64px] font-semibold leading-none tabular-nums tracking-tight text-zinc-50">
                {Math.round(data.unique.bestWpm)}
              </span>
              <div className="flex flex-col justify-end gap-0.5 pb-1">
                <span className="text-[12px] font-medium uppercase tracking-[0.14em] text-zinc-400">PPM</span>
                <span className="text-[12.5px] text-zinc-500">melhor velocidade</span>
              </div>
            </div>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
              {rankCopy(data.unique.bestWpm)}. Atingido com{" "}
              <span className="text-zinc-200">{data.unique.bestAccuracy}%</span> de precisão máxima.
            </p>
          </motion.section>

          <Divider />

          {/* Secondary metrics — hairline strip */}
          <section className="grid grid-cols-3">
            {[
              ["Corridas", String(data.unique.totalRaces)],
              ["Linguagens", String(data.unique.languages)],
              ["Precisão máx", `${data.unique.bestAccuracy}%`],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={cn(
                  "flex flex-col gap-1 py-2",
                  i > 0 && "border-l border-white/[0.07] pl-5",
                  i === 0 && "pr-5"
                )}
              >
                <span className="font-mono text-[22px] font-semibold leading-none tabular-nums text-zinc-100">
                  {value}
                </span>
                <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-zinc-600">{label}</span>
              </div>
            ))}
          </section>

          <Divider className="mt-5" />

          {/* Languages */}
          <section className="mt-8">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold text-zinc-100">Por linguagem</h2>
              <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-600">PPM médio</span>
            </div>
            {byWpm.length === 0 && <p className="mt-5 text-[13px] text-zinc-500">Sem corridas por linguagem ainda.</p>}

            <div className="mt-1">
              {byWpm.map((s, i) => {
                const lang = s.language ? LANGUAGES[s.language] : null;
                const maxAvg = Math.max(...byWpm.map((x) => x.avgWpm), 1);
                return (
                  <motion.div
                    key={s.language ?? "none"}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: EASE, delay: 0.05 + i * 0.03 }}
                    className="py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex w-5 shrink-0 justify-center">
                        {lang ? (
                          <img src={deviconUrl(lang.icon)} alt="" className="size-5" draggable={false} width={20} height={20} />
                        ) : (
                          <span className="size-5 rounded-full bg-white/[0.06]" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13.5px] text-zinc-200">{lang?.name ?? "Outros"}</span>
                      <span className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-zinc-50">
                        {Math.round(s.avgWpm)}
                      </span>
                    </div>
                    <div className="mt-2 flex h-[3px] items-stretch overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="rounded-full bg-accent/80 transition-all duration-700"
                        style={{ width: `${(s.avgWpm / maxAvg) * 100}%` }}
                      />
                    </div>
                    <p className="mt-1.5 font-mono text-[10.5px] tabular-nums text-zinc-600">
                      {s.races} {s.races === 1 ? "corrida" : "corridas"} ·{" "}
                      {(s.avgAcc * 100).toFixed(0)}% · {s.totalErrors} erros · ∅{formatTime(s.avgTime)}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function rankCopy(wpm: number): string {
  if (wpm >= 150) return "Velocidade de máquina — raríssimo.";
  if (wpm >= 100) return "Ritmo competitivo, acima da média.";
  if (wpm >= 55) return "Ritmo fluido e constante.";
  if (wpm >= 35) return "Um bom ritmo em progresso.";
  return "Começando a engrenar — siga firme.";
}

function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px w-full bg-white/[0.06]", className)} />;
}