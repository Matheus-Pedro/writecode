import { useState } from "react";
import { LANGUAGE_ORDER, LANGUAGES, deviconUrl } from "../languages";
import { fetchGithubRandom, type SnippetData } from "../api";
import { Button } from "./ui/button";
import { PageShell, BackBar, Eyebrow } from "./design-system";
import { Loader, Shuffle } from "./icons";
import { cn } from "../lib/utils";

interface Props {
  onBack: () => void;
  onStart: (lang: string, snippet: SnippetData) => void;
}

export function SurvivalScreen({ onBack, onStart }: Props) {
  const [language, setLanguage] = useState<string>(LANGUAGE_ORDER[0]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function start() {
    setBusy(true);
    setErr("");
    try {
      const snippet = await fetchGithubRandom(language);
      onStart(language, snippet);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Falha ao carregar o trecho.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <BackBar onBack={onBack} />
      <Eyebrow>Modo de jogo</Eyebrow>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Survival</h1>
      <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
        Quanto mais tempo você digita sem erro, mais longe vai. Um único erro encerra o jogo.
      </p>

      <div className="mt-9 flex flex-col gap-6">
        <div>
          <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">Linguagem</label>
          <div className="flex flex-wrap gap-1.5">
            {LANGUAGE_ORDER.map((id) => {
              const lang = LANGUAGES[id];
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

        {err && <p className="text-[13px] text-red-400">{err}</p>}

        <Button variant="primary" size="lg" onClick={start} disabled={busy}>
          {busy ? <Loader className="size-4" /> : <Shuffle className="size-4" />}
          {busy ? "Carregando…" : "Iniciar survival"}
        </Button>
      </div>
    </PageShell>
  );
}