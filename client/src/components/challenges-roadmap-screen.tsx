import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { fetchChallengeList, type ChallengeSummary } from "../api.js";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { ChevronLeft, ChevronRight, Close } from "./icons.jsx";
import { Skeleton } from "./ui/skeleton.js";
import { LANGUAGES, deviconUrl } from "../languages.js";

const ease = [0.16, 1, 0.3, 1] as const;

const DIFF: Record<string, { label: string; variant: "success" | "subtle" | "accent" }> = {
  easy: { label: "Fácil", variant: "success" },
  medium: { label: "Médio", variant: "subtle" },
  hard: { label: "Difícil", variant: "accent" },
};

const STAGES: { key: string; title: string; desc: string }[] = [
  { key: "easy", title: "Fundamentos", desc: "Primeiros passos" },
  { key: "medium", title: "Intermediário", desc: "Pensamento lógico" },
  { key: "hard", title: "Avançado", desc: "Para dominar" },
];

export function ChallengeRoadmapScreen({
  language,
  onBack,
  onOpen,
}: {
  language: string;
  onBack: () => void;
  onOpen: (id: string) => void;
}) {
  const [challenges, setChallenges] = useState<ChallengeSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchChallengeList()
      .then((r) => setChallenges(r.challenges))
      .catch(() => setError("Não foi possível carregar o roadmap."));
  }, []);

  const def = LANGUAGES[language];

  const sections = useMemo(() => {
    if (!challenges) return [];
    return STAGES.map((stage) => ({
      ...stage,
      items: challenges
        .filter((c) => c.difficulty === stage.key && c.languages.includes(language))
        .map((c) => ({ id: c.id, title: c.title, xp: c.xp, difficulty: c.difficulty })),
    })).filter((s) => s.items.length > 0);
  }, [challenges, language]);

  const total = sections.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <div className="mx-auto w-full max-w-shell px-6 pt-8 pb-24">
      <div className="mb-8 flex items-center gap-3">
        <Button variant="icon" size="icon" aria-label="Voltar" onClick={onBack}>
          <ChevronLeft />
        </Button>
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-[7px] border border-white/[0.06] bg-ink-800">
            {def?.icon ? (
              <img src={deviconUrl(def.icon)} alt="" className="size-5" draggable={false} width={20} height={20} loading="lazy" />
            ) : (
              <span className="font-mono text-[12px] font-semibold text-zinc-300">{def?.glyph}</span>
            )}
          </span>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-[17px] font-semibold tracking-tight text-zinc-100">
              {def?.name ?? language}
            </h1>
            <p className="text-[12px] text-zinc-500">
              {total} {total === 1 ? "desafio" : "desafios"} · trilha para dominar a linguagem
            </p>
          </div>
          <Badge variant="accent" className="ml-1 hidden sm:inline-flex">
            Roadmap
          </Badge>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-[7px] border border-red-500/20 bg-red-500/5 px-4 py-3.5 text-[13px] text-red-300">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-red-500/15">
            <Close className="size-3" />
          </span>
          <span>{error}</span>
        </div>
      )}

      {!challenges && !error && (
        <div className="flex flex-col gap-6" aria-label="Carregando roadmap">
          {Array.from({ length: 2 }).map((_, s) => (
            <div key={s} className="flex gap-5">
              <Skeleton className="mt-1 size-8 rounded-full" />
              <div className="flex flex-1 flex-col gap-2.5">
                <Skeleton className="h-4 w-28" />
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[54px] w-full rounded-[7px]" />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {challenges && sections.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-[7px] border border-white/[0.06] bg-ink-900/60 px-4 py-14 text-center">
          <span className="flex size-10 items-center justify-center rounded-full border border-white/[0.06] bg-ink-800 text-zinc-500">
            {def?.glyph}
          </span>
          <p className="text-[13px] text-zinc-500">
            Nenhum desafio disponível para essa linguagem ainda.
          </p>
        </div>
      )}

      {sections.length > 0 && (
        <div className="relative">
          <span
            aria-hidden
            className="absolute top-3 bottom-4 left-[15px] w-px bg-white/[0.07]"
          />
          {sections.map((section, si) => (
            <motion.section
              key={section.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease, delay: 0.05 * si }}
              className="relative flex gap-5"
            >
              <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-ink-800 font-mono text-[11px] font-semibold text-accent">
                {si + 1}
              </span>

              <div className="min-w-0 flex-1 pb-8">
                <div className="mb-2.5 flex items-baseline justify-between gap-3">
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-[13px] font-semibold text-zinc-200">
                      {section.title}
                    </span>
                    <span className="text-[11.5px] text-zinc-600">{section.desc}</span>
                  </div>
                  <span className="font-mono text-[11.5px] tabular-nums text-zinc-600">
                    {section.items.length}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  {section.items.map((item, ii) => {
                    const d = DIFF[item.difficulty] || DIFF.easy;
                    return (
                      <motion.button
                        key={item.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.26, ease, delay: 0.06 * ii }}
                        onClick={() => onOpen(item.id)}
                        className="group flex w-full items-center gap-3.5 rounded-[7px] border border-white/[0.06] bg-ink-900/70 px-4 py-3.5 text-left transition-all duration-150 hover:border-white/[0.13] hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
                      >
                        <span className="font-mono text-[12px] tabular-nums text-zinc-600 transition-colors duration-150 group-hover:text-accent">
                          {String(ii + 1).padStart(2, "0")}
                        </span>
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          <span className="truncate text-[14px] font-medium text-zinc-100">
                            {item.title}
                          </span>
                          <Badge variant={d.variant} className="hidden sm:inline-flex">
                            {d.label}
                          </Badge>
                        </span>
                        <span className="shrink-0 font-mono text-[11.5px] text-accent">
                          +{item.xp} XP
                        </span>
                        <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-300" />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}