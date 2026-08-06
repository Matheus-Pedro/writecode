import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchChallengeList, type ChallengeSummary } from "../api.js";
import { Button } from "./ui/button.js";
import { ChevronLeft, ChevronRight, Close } from "./icons.jsx";
import { SkeletonRow } from "./ui/skeleton.js";
import { LANGUAGE_ORDER, LANGUAGES, deviconUrl } from "../languages.js";

const ease = [0.16, 1, 0.3, 1] as const;

export function ChallengeLanguagesScreen({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (language: string) => void;
}) {
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallengeList()
      .then((r) => setChallenges(r.challenges))
      .catch(() => setError("Não foi possível carregar os desafios."));
  }, []);

  const langs = useMemo(() => {
    if (!challenges) return [];
    const set = new Set<string>();
    for (const c of challenges) for (const l of c.languages) set.add(l);
    return LANGUAGE_ORDER.filter((l) => set.has(l));
  }, [challenges]);

  const countFor = (lang: string) =>
    challenges ? challenges.filter((c) => c.languages.includes(lang)).length : 0;

  return (
    <div className="mx-auto w-full max-w-shell px-6 pt-14 pb-24">
      <Button variant="ghost" size="sm" onClick={onBack} className="absolute top-6 left-6">
        <ChevronLeft className="size-4" /> Voltar
      </Button>

      <header className="mb-8 flex flex-col gap-2.5">
        <span className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
          Desafios de lógica
        </span>
        <h1 className="text-[22px] font-semibold tracking-tight text-zinc-100">
          Escolha a linguagem
        </h1>
        <p className="max-w-md text-[13.5px] leading-relaxed text-zinc-500">
          Você escolhe uma linguagem e segue uma trilha de desafios — do básico ao avançado.
        </p>
      </header>

      {error && (
        <div className="flex items-center gap-3 rounded-[7px] border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-[13px] text-red-300">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <Close className="size-3" />
          </span>
          <span>{error}</span>
        </div>
      )}

      {!challenges && !error && (
        <div className="flex flex-col gap-2.5" aria-label="Carregando linguagens">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      )}

      {challenges && (
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          className="flex flex-col gap-2"
        >
          {langs.map((id) => {
            const def = LANGUAGES[id];
            const n = countFor(id);
            return (
              <motion.button
                key={id}
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease } },
                }}
                onClick={() => onChoose(id)}
                className="group flex w-full items-center gap-4 rounded-[7px] border border-white/[0.07] bg-ink-900/70 px-4 py-3.5 text-left transition-all duration-150 hover:border-white/[0.14] hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[6px] border border-white/[0.06] bg-ink-800">
                  {def?.icon ? (
                    <img
                      src={deviconUrl(def.icon)}
                      alt=""
                      className="size-5"
                      draggable={false}
                      width={20}
                      height={20}
                      loading="lazy"
                    />
                  ) : (
                    <span className="font-mono text-[11px] font-semibold text-zinc-300">
                      {def?.glyph ?? id.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[14px] font-medium text-zinc-100">
                    {def?.name ?? id}
                  </span>
                  <span className="truncate text-[12px] text-zinc-500">
                    {n} {n === 1 ? "desafio" : "desafios"}
                    <span aria-hidden className="mx-1.5 text-zinc-700">
                      ·
                    </span>
                    {def?.desc ?? "Treine lógica"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-300" />
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}