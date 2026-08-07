import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getResults, type ResultRow } from "../api";
import { LANGUAGES, deviconUrl } from "../languages";
import { formatTime } from "../stats";
import { Button } from "./ui/button";
import { ChevronLeft } from "./icons";

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getResults()
      .then((r) => setResults(r.results))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const totalXp = results.reduce((acc, r) => acc + (r.xp || 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col pt-[4vh]">
      <div className="mb-10 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Início</span>
        </Button>
      </div>

      {error && <p className="text-[13px] text-red-400">Falha ao carregar o histórico.</p>}

      {loading && (
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-end gap-4">
            <span className="h-16 w-24 animate-pulse rounded-md bg-white/[0.04]" />
            <span className="h-4 w-40 animate-pulse rounded-sm bg-white/[0.04]" />
          </div>
          <div className="mt-2 space-y-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <span className="size-10 animate-pulse rounded-full bg-white/[0.04]" />
                <div className="flex-1 space-y-1.5">
                  <span className="block h-3.5 w-1/3 animate-pulse rounded-sm bg-white/[0.04]" />
                  <span className="block h-3 w-2/5 animate-pulse rounded-sm bg-white/[0.04]" />
                </div>
                <span className="h-4 w-12 animate-pulse rounded-sm bg-white/[0.04]" />
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && !error && results.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="py-16 text-center"
        >
          <p className="text-[14px] font-medium text-zinc-200">Ainda sem registros</p>
          <p className="mx-auto mt-2 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            Complete uma corrida logado para ela aparecer aqui.
          </p>
        </motion.div>
      )}

      {!loading && !error && results.length > 0 && (
        <div className="flex flex-col">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">Registro de corridas</p>
            <div className="mt-4 flex items-baseline gap-4">
              <span className="font-mono text-[56px] font-semibold leading-none tabular-nums tracking-tight text-zinc-50">
                {results.length}
              </span>
              <span className="mb-1 text-[12.5px] text-zinc-400">
                {results.length === 1 ? "corrida salva" : "corridas salvas"}
              </span>
            </div>
            <p className="mt-3 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
              Últimas {Math.min(results.length, 50)} corridas, {totalXp} XP acumulados no total.
            </p>
          </motion.section>

          {/* List */}
          <div className="mt-8 flex flex-col">
            {results.map((r, i) => {
              const lang = r.language ? LANGUAGES[r.language] : null;
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1], delay: Math.min(i * 0.03, 0.3) }}
                  className="flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.015]">
                    {lang ? (
                      <img src={deviconUrl(lang.icon)} alt="" className="size-5" draggable={false} loading="lazy" width={20} height={20} />
                    ) : (
                      <span className="font-mono text-[11px] text-zinc-500">{r.language?.slice(0, 2) ?? "?"}</span>
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-zinc-100">{lang?.name ?? r.language ?? "—"}</p>
                    <p className="truncate text-[12px] text-zinc-500">
                      {r.source || "trecho local"} · {formatDate(r.created_at)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-6">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[16px] font-semibold leading-none tabular-nums text-zinc-50">
                        {r.wpm.toFixed(0)}
                      </span>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">PPM</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-[13px] leading-none tabular-nums text-zinc-300">
                        {(r.accuracy * 100).toFixed(0)}%
                      </span>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">Precisão</span>
                    </div>
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="font-mono text-[13px] leading-none tabular-nums text-zinc-300">
                        {formatTime(r.elapsed)}
                      </span>
                      <span className="mt-1 text-[10px] font-medium uppercase tracking-[0.1em] text-zinc-600">Tempo</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}