import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getAchievements, getRanking, type Achievement, type RankRow } from "../api";
import {
  PageShell,
  BackBar,
  Eyebrow,
  HeroMetric,
  SectionHead,
  SkeletonList,
  EmptyState,
  Segmented,
  AchievementGlyph,
  EASE,
} from "./design-system";
import { cn } from "../lib/utils";

export function AchievementsScreen({ onBack }: { onBack: () => void }) {
  const [data, setData] = useState<{ unlocked: number; total: number; achievements: Achievement[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAchievements()
      .then(setData)
      .catch(() => setError(true));
  }, []);

  const list = data?.achievements ?? [];
  const unlocked = list.filter((a) => a.unlocked);
  const locked = list.filter((a) => !a.unlocked);

  return (
    <PageShell>
      <BackBar onBack={onBack} />
      {error && <p className="text-[13px] text-red-400">Falha ao carregar as conquistas.</p>}

      {!data && !error && <SkeletonList rows={8} />}

      {data && (
        <div className="flex flex-col">
          <HeroMetric
            label="Coleção"
            value={
              <>
                {data.unlocked}
                <span className="text-[26px] text-zinc-600">/{data.total}</span>
              </>
            }
            caption={
              data.unlocked === 0
                ? "Participe de corridas, acerte e pratique em várias linguagens para ganhar cada uma."
                : data.unlocked === data.total
                  ? "Coleção completa — você alcançou todos os marcos."
                  : `Restam ${data.total - data.unlocked} ${data.total - data.unlocked === 1 ? "marco" : "marcos"} por desbloquear na sua coleção.`
            }
          />

          {unlocked.length > 0 && (
            <section className="mt-10">
              <SectionHead title="Desbloqueadas" caption="Sua coleção atual." />
              <div className="mt-3 flex flex-col">
                {unlocked.map((a, i) => (
                  <AchievementRow key={a.id} a={a} visible delay={i * 0.03} />
                ))}
              </div>
            </section>
          )}

          {locked.length > 0 && (
            <section className="mt-9">
              <SectionHead title="A descobrir" meta={`${locked.length} restantes`} />
              <div className="mt-3 flex flex-col">
                {locked.map((a, i) => (
                  <AchievementRow key={a.id} a={a} visible={false} delay={i * 0.02} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}

function AchievementRow({ a, visible, delay }: { a: Achievement; visible: boolean; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
      className={cn(
        "flex items-center gap-4 border-b border-white/[0.05] py-4 last:border-b-0",
        !visible && "opacity-55"
      )}
    >
      <span
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-full border",
          visible
            ? "border-accent/30 bg-accent-soft text-accent"
            : "border-white/[0.08] bg-white/[0.015] text-zinc-600"
        )}
      >
        <AchievementGlyph icon={a.icon} locked={!visible} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[13.5px] font-medium", visible ? "text-zinc-100" : "text-zinc-500")}>{a.title}</p>
        <p className="truncate text-[12px] text-zinc-500">{a.desc}</p>
      </div>
      {visible && <span className="shrink-0 font-mono text-[10.5px] uppercase tracking-[0.1em] text-accent/80">✓</span>}
    </motion.div>
  );
}

export function RankingScreen({ onBack, onOpenProfile }: { onBack: () => void; onOpenProfile: (ref: string) => void }) {
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly" | "all">("all");
  const [data, setData] = useState<RankRow[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getRanking(period)
      .then((r) => setData(r.ranking))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <PageShell>
      <BackBar onBack={onBack} />
      <Eyebrow>Classificação</Eyebrow>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Ranking global</h1>
      <div className="mt-4">
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { id: "all", label: "Geral" },
            { id: "weekly", label: "Semanal" },
            { id: "monthly", label: "Mensal" },
          ]}
        />
      </div>

      {loading && <div className="mt-6"><SkeletonList rows={8} /></div>}
      {!loading && data?.length === 0 && (
        <div className="mt-4">
          <EmptyState title="Nenhum dado ainda" body="Complete corridas para entrar no ranking." />
        </div>
      )}

      {!loading && (data?.length ?? 0) > 0 && (
        <div className="mt-6 flex flex-col">
          {data?.map((r, i) => (
            <motion.button
              key={r.id}
              onClick={() => onOpenProfile(r.name)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: EASE, delay: i * 0.02 }}
              className="group flex items-center gap-4 border-b border-white/[0.05] py-3 text-left last:border-b-0"
            >
              <span className="w-8 shrink-0 text-center">
                {r.rank <= 3 ? (
                  <span
                    className={cn(
                      "inline-flex size-6 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
                      r.rank === 1
                        ? "border-accent/40 bg-accent-soft text-accent"
                        : "border-white/[0.1] bg-white/[0.02] text-zinc-400"
                    )}
                  >
                    {r.rank}
                  </span>
                ) : (
                  <span className="font-mono text-[12px] tabular-nums text-zinc-600">{r.rank}</span>
                )}
              </span>
              {r.avatarUrl ? (
                <img src={r.avatarUrl} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" width={32} height={32} />
              ) : (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-[12px] font-semibold text-zinc-300">
                  {r.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-zinc-200">{r.name}</span>
              <span className="shrink-0 text-right">
                <span className="block font-mono text-[14px] font-semibold tabular-nums text-accent">{r.bestWpm} PPM</span>
                <span className="block text-[10px] tabular-nums text-zinc-500">
                  {(r.avgAccuracy * 100).toFixed(0)}% · {r.races} corridas
                </span>
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </PageShell>
  );
}