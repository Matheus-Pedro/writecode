import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DIFFICULTIES, LANGUAGES, deviconUrl } from "../languages";
import { fetchAiSnippet, fetchGithubRandom, fetchGithubRepo, type SnippetData } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, Skeleton } from "./ui/card";
import { ArrowRight, ChevronLeft, Github, Loader, Repo, Sparkle } from "./icons";

type Source = "github-random" | "github-repo" | "ai";

interface SourceDef {
  id: Source;
  title: string;
  desc: string;
  icon: typeof Github;
}

const SOURCES: SourceDef[] = [
  {
    id: "github-random",
    title: "Aleatório do GitHub",
    desc: "Trechos de repositórios populares da linguagem",
    icon: Github,
  },
  {
    id: "github-repo",
    title: "Repositório específico",
    desc: "Digite um repositório, ex: psf/requests",
    icon: Repo,
  },
  {
    id: "ai",
    title: "Gerado por IA",
    desc: "Trecho sob medida para você",
    icon: Sparkle,
  },
];

export function SetupScreen({
  language,
  aiEnabled,
  loggedIn,
  onBack,
  onRequestLogin,
  onStart,
}: {
  language: string;
  aiEnabled: boolean;
  loggedIn: boolean;
  onBack: () => void;
  onRequestLogin: () => void;
  onStart: (lang: string, snippet: SnippetData) => void;
}) {
  const lang = LANGUAGES[language];
  const [source, setSource] = useState<Source>("github-random");
  const [repo, setRepo] = useState("");
  const [difficulty, setDifficulty] = useState<string>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const repoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (source === "github-repo") repoRef.current?.focus();
  }, [source]);

  async function start() {
    setLoading(true);
    setError("");
    try {
      const data =
        source === "github-random"
          ? await fetchGithubRandom(language)
          : source === "github-repo"
            ? await fetchGithubRepo(language, repo)
            : await fetchAiSnippet(language, difficulty);
      onStart(language, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao buscar o trecho.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col pt-[10vh]">
      <div className="mb-9 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ChevronLeft className="size-4" />
          Linguagens
        </Button>
        <span className="ml-auto flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] py-1 pl-1 pr-2.5">
          <span className="flex size-5 items-center justify-center rounded-full bg-white/[0.06]">
            <img src={deviconUrl(lang.icon)} alt="" className="size-3.5" draggable={false} />
          </span>
          <span className="text-[12px] font-medium text-zinc-300">{lang.name}</span>
        </span>
      </div>

      <div className="mb-7">
        <h1 className="text-[17px] font-semibold tracking-tight text-zinc-100">
          De onde vem o trecho?
        </h1>
        <p className="mt-1 text-[13px] text-zinc-500">
          A fonte escolhida define o estilo e a dificuldade do código.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          const disabled = s.id === "ai" && !aiEnabled;
          const needsLogin = s.id === "ai" && aiEnabled && !loggedIn;
          const active = source === s.id;
          return (
            <button
              key={s.id}
              onClick={() => {
                if (needsLogin) {
                  onRequestLogin();
                  return;
                }
                if (!disabled) setSource(s.id);
              }}
              disabled={disabled}
              aria-pressed={active}
              className={[
                "group flex items-center gap-4 rounded-md border px-4 py-3.5 text-left transition-all duration-150",
                active
                  ? "border-accent/40 bg-accent-soft/[0.05]"
                  : "border-white/[0.07] bg-ink-900 hover:border-white/[0.14] hover:bg-white/[0.02]",
                disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
              ].join(" ")}
            >
              <span
                className={[
                  "flex size-9 shrink-0 items-center justify-center rounded-sm border transition-colors duration-150",
                  active
                    ? "border-accent/30 bg-accent-soft text-accent-hover"
                    : "border-white/[0.08] bg-white/[0.02] text-zinc-500 group-hover:text-zinc-300",
                ].join(" ")}
              >
                <Icon className="size-[17px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-[14px] font-medium text-zinc-100">{s.title}</span>
                <span className="text-[12px] text-zinc-500">
                  {s.id === "ai"
                    ? !aiEnabled
                      ? "Desativado — em breve"
                      : !loggedIn
                        ? "Faça login para usar"
                        : s.desc
                    : s.desc}
                </span>
              </span>
              <span
                className={[
                  "flex size-4 shrink-0 items-center justify-center rounded-full border transition-all duration-150",
                  active ? "border-accent bg-accent" : "border-zinc-600 group-hover:border-zinc-500",
                ].join(" ")}
              >
                {active && <span className="size-1.5 rounded-full bg-ink-950" />}
              </span>
            </button>
          );
        })}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <SnippetSkeleton />
          </motion.div>
        ) : (
          <motion.div
            key="config"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {source === "github-repo" && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Repositório
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-zinc-600">
                    /
                  </span>
                  <Input
                    ref={repoRef}
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && start()}
                    placeholder="owner/repo"
                    className="pl-7"
                    aria-label="Repositório no formato owner/repo"
                  />
                </div>
              </div>
            )}

            {source === "ai" && aiEnabled && loggedIn && (
              <div className="mt-4">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
                  Dificuldade
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDifficulty(d.id)}
                      aria-pressed={difficulty === d.id}
                      className={[
                        "flex flex-col items-center gap-0.5 rounded-sm border px-2 py-2.5 text-[13px] font-medium transition-all duration-150",
                        difficulty === d.id
                          ? "border-white/20 bg-white/[0.07] text-zinc-100"
                          : "border-white/[0.06] bg-white/[0.02] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-300",
                      ].join(" ")}
                    >
                      {d.label}
                      <span className="text-[10px] font-normal text-zinc-600">{d.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="mt-4 rounded-sm border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[13px] text-red-400">
                {error}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex items-center justify-between">
        <span className="hidden items-center gap-1.5 text-[11px] text-zinc-600 sm:flex">
          <kbd className="rounded-sm border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
            Enter
          </kbd>
          para começar
        </span>
        <Button
          variant="primary"
          size="lg"
          onClick={start}
          disabled={loading || (source === "github-repo" && !repo.trim())}
          className="w-full sm:w-auto"
        >
          {loading ? (
            <>
              <Loader className="size-4" />
              Buscando trecho…
            </>
          ) : (
            <>
              Começar a digitar
              <ArrowRight className="size-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function SnippetSkeleton() {
  return (
    <Card className="mt-4 overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="h-3 w-8" />
      </div>
      <div className="space-y-2.5 p-5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </Card>
  );
}
