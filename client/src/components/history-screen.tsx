import { useEffect, useState } from "react";
import { getResults, type ResultRow } from "../api";
import { LANGUAGES, deviconUrl } from "../languages";
import { formatTime } from "../stats";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { ChevronLeft, Loader } from "./icons";
import { motion } from "framer-motion";

export function HistoryScreen({ onBack }: { onBack: () => void }) {
  const [results, setResults] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getResults()
      .then((r) => setResults(r.results))
      .catch(() => setError("Falha ao carregar o histórico."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col pt-[8vh]">
      <div className="mb-7 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          Voltar
        </Button>
        <h1 className="text-[17px] font-semibold tracking-tight text-zinc-100">Histórico</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-zinc-500">
          <Loader className="size-4 animate-spin" />
          Carregando…
        </div>
      ) : error ? (
        <p className="rounded-sm border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[13px] text-red-400">
          {error}
        </p>
      ) : results.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-zinc-600">
          Nenhum resultado salvo ainda. Digite um trecho logado para aparecer aqui.
        </p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {results.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: Math.min(i * 0.03, 0.3) }}
            >
              <Card className="flex items-center gap-4 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.02]">
                  {r.language && LANGUAGES[r.language] ? (
                    <img
                      src={deviconUrl(LANGUAGES[r.language].icon)}
                      alt=""
                      className="size-5"
                      draggable={false}
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-mono text-[12px] text-zinc-400">{r.language?.slice(0, 2) ?? "?"}</span>
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-zinc-100">
                    {r.language ? LANGUAGES[r.language]?.name ?? r.language : "—"}
                  </span>
                  <span className="truncate text-[11.5px] text-zinc-600">
                    {r.source || "—"} · {formatDate(r.created_at)}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-5">
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[15px] font-semibold tabular-nums text-zinc-100">
                      {r.wpm.toFixed(0)}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-600">PPM</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[15px] font-semibold tabular-nums text-zinc-100">
                      {(r.accuracy * 100).toFixed(0)}%
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-600">Precisão</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[15px] font-semibold tabular-nums text-zinc-100">
                      {formatTime(r.elapsed)}
                    </span>
                    <span className="text-[9px] font-medium uppercase tracking-[0.1em] text-zinc-600">Tempo</span>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
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