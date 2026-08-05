import { useMemo, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { LANGUAGE_ORDER, LANGUAGES, deviconUrl } from "../languages.js";
import { ChevronRight, Github, Search, Sparkle } from "./icons.jsx";
import { cn } from "../lib/utils.js";

const ease = [0.16, 1, 0.3, 1] as const;
const MANY = 7;

const listVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.04, delayChildren: 0.06 } },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
};

export function HomeScreen({ onSelect }: { onSelect: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const many = LANGUAGE_ORDER.length >= MANY;
  const q = query.trim().toLowerCase();

  const languages = useMemo(() => {
    const list = LANGUAGE_ORDER.map((id) => LANGUAGES[id]).filter(Boolean);
    if (!q) return list;
    return list.filter((l) => l.name.toLowerCase().includes(q));
  }, [q]);

  return (
    <div
      className={cn(
        "mx-auto flex w-full flex-col items-stretch",
        many ? "max-w-xl pt-[8vh]" : "max-w-sm pt-[14vh]"
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease }}
        className="mb-6 flex flex-col gap-1.5"
      >
        <h1 className="text-[17px] font-semibold tracking-tight text-zinc-100">
          O que você quer praticar?
        </h1>
        <p className="text-[13px] text-zinc-500">
          Escolha uma linguagem e receba um trecho real de código para digitar.
        </p>
      </motion.div>

      {many && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className="relative mb-4"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-600" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar linguagem…"
            aria-label="Buscar linguagem"
            className="h-9 w-full rounded-sm border border-white/10 bg-white/[0.02] pl-9 pr-3 text-sm text-zinc-100 transition-colors duration-150 placeholder:text-zinc-600 hover:border-white/[0.16] focus-visible:border-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/40"
          />
        </motion.div>
      )}

      <motion.div
        variants={listVariants}
        initial="hidden"
        animate="show"
        className={cn(
          many
            ? "grid grid-cols-1 gap-2.5 sm:grid-cols-2"
            : "flex flex-col overflow-hidden rounded-md border border-white/[0.06] bg-ink-900"
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {languages.map((lang) =>
            many ? (
              <motion.button
                key={lang.id}
                variants={rowVariants}
                layout
                exit="exit"
                onClick={() => onSelect(lang.id)}
                className="group flex w-full items-center gap-3.5 rounded-md border border-white/[0.07] bg-ink-900 px-4 py-3.5 text-left transition-colors duration-150 hover:border-white/[0.14] hover:bg-white/[0.02]"
              >
                <LanguageRowContent lang={lang} />
              </motion.button>
            ) : (
              <motion.button
                key={lang.id}
                variants={rowVariants}
                onClick={() => onSelect(lang.id)}
                className="group flex w-full items-center gap-3.5 border-b border-white/[0.05] px-4 py-3.5 text-left transition-colors duration-150 last:border-b-0 hover:bg-white/[0.03]"
              >
                <LanguageRowContent lang={lang} />
              </motion.button>
            )
          )}
        </AnimatePresence>
      </motion.div>

      {q && languages.length === 0 && (
        <p className="mt-6 text-center text-[13px] text-zinc-600">Nenhuma linguagem encontrada.</p>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className={cn(
          "mt-6 flex items-center justify-center gap-1.5 text-[11px] text-zinc-600",
          languages.length === 0 && "hidden"
        )}
      >
        <Github className="size-3.5" />
        <span>Trechos reais de repositórios</span>
        <span className="mx-1">·</span>
        <Sparkle className="size-3.5" />
        <span>ou gerados por IA</span>
      </motion.div>
    </div>
  );
}

function LanguageRowContent({ lang }: { lang: { id: string; name: string; icon: string; desc: string } }) {
  return (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.02]">
        <img src={deviconUrl(lang.icon)} alt="" className="size-5" draggable={false} loading="lazy" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[14px] font-medium text-zinc-100">{lang.name}</span>
        <span className="truncate text-[12px] text-zinc-500">{lang.desc}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-zinc-600 transition-all duration-150 group-hover:translate-x-0.5 group-hover:text-zinc-300" />
    </>
  );
}
