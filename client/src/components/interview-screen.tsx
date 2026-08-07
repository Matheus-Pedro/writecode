import { useEffect, useState } from "react";
import { LANGUAGES } from "../languages";
import { getInterviewProblems, fetchInterviewSnippet, type InterviewProblem, type SnippetData } from "../api";
import { Button } from "./ui/button";
import { PageShell, BackBar, Eyebrow } from "./design-system";
import { Loader, Terminal } from "./icons";
import { deviconUrl } from "../languages";
import { cn } from "../lib/utils";

interface Props {
  onBack: () => void;
  onStart: (lang: string, snippet: SnippetData) => void;
}

export function InterviewScreen({ onBack, onStart }: Props) {
  const [data, setData] = useState<{ languages: string[]; problems: InterviewProblem[] } | null>(null);
  const [language, setLanguage] = useState("");
  const [problem, setProblem] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    getInterviewProblems()
      .then((d) => {
        setData(d);
        setLanguage(d.languages[0] || "");
        setProblem(d.problems[0]?.id || "");
      })
      .catch(() => setErr("Falha ao carregar a lista de problemas."));
  }, []);

  async function start() {
    if (!language || !problem) return;
    setBusy(true);
    setErr("");
    try {
      const snippet = await fetchInterviewSnippet(language, problem);
      onStart(language, snippet);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao carregar o problema.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <BackBar onBack={onBack} />
      <Eyebrow>Preparação</Eyebrow>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Entrevista técnica</h1>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
        Reproduza a solução clássica dos problemas mais cobrados em entrevistas e receba métricas de velocidade e precisão.
      </p>

      <div className="mt-9 flex flex-col gap-6">
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">Linguagem</label>
          <div className="flex flex-wrap gap-1.5">
            {data?.languages.map((id) => {
              const lang = LANGUAGES[id];
              if (!lang) return null;
              return (
                <button
                  key={id}
                  onClick={() => setLanguage(id)}
                  aria-pressed={language === id}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                    language === id
                      ? "border-accent/40 bg-accent-soft text-zinc-100"
                      : "border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:border-white/[0.14] hover:text-zinc-300"
                  )}
                >
                  <img src={deviconUrl(lang.icon)} alt="" className="size-3.5" draggable={false} width={14} height={14} />
                  {lang.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">Problema</label>
          <div className="flex flex-col">
            {data?.problems.map((p) => (
              <button
                key={p.id}
                onClick={() => setProblem(p.id)}
                aria-pressed={problem === p.id}
                className={cn(
                  "flex items-center justify-between gap-3 border-b border-white/[0.05] py-3 text-left last:border-b-0",
                  problem === p.id ? "" : "opacity-70"
                )}
              >
                <span className="font-mono text-[13.5px] text-zinc-100">{p.title}</span>
                <span className="shrink-0 text-[11px] text-zinc-500">{p.difficulty}</span>
              </button>
            ))}
          </div>
        </div>

        {err && <p className="text-[13px] text-red-400">{err}</p>}

        <Button variant="primary" size="lg" onClick={start} disabled={busy || !language || !problem}>
          {busy ? <Loader className="size-4" /> : <Terminal className="size-4" />}
          {busy ? "Carregando…" : "Começar a digitar"}
        </Button>
      </div>
    </PageShell>
  );
}