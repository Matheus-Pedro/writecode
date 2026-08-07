import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LANGUAGES, deviconUrl } from "../languages";
import { getPublicProfile, type PublicProfile } from "../api";
import { formatTime } from "../stats";
import {
  PageShell,
  BackBar,
  MetricStrip,
  SectionHead,
  SkeletonList,
  EmptyState,
  AchievementGlyph,
  screenMotion,
  EASE,
} from "./design-system";
import { cn } from "../lib/utils";

interface Props {
  ref: string | number;
  onBack: () => void;
  onOpenRanking: () => void;
}

export function ProfileScreen({ ref, onBack, onOpenRanking }: Props) {
  const [data, setData] = useState<PublicProfile | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    getPublicProfile(ref)
      .then(setData)
      .catch(() => setError(true));
  }, [ref]);

  return (
    <PageShell>
      <BackBar onBack={onBack} />

      {error && <EmptyState title="Perfil não encontrado" body="Verifique o nome ou tente novamente." />}

      {!data && !error && <SkeletonList rows={6} />}

      {data && (
        <div className="flex flex-col">
          {/* Identity */}
          <motion.section {...screenMotion}>
            <div className="flex items-center gap-5">
              {data.profile.avatarUrl ? (
                <img
                  src={data.profile.avatarUrl}
                  alt=""
                  className="size-16 rounded-full"
                  referrerPolicy="no-referrer"
                  width={64}
                  height={64}
                />
              ) : (
                <span className="flex size-16 items-center justify-center rounded-full bg-white/[0.08] text-[22px] font-semibold text-zinc-200">
                  {data.profile.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-[22px] font-semibold tracking-tight text-zinc-50">{data.profile.name}</h1>
                <p className="mt-1 font-mono text-[12.5px] text-zinc-500">
                  Lv {data.profile.level} · {data.profile.xp} XP
                </p>
                {data.profile.worldRank && (
                  <p className="mt-1.5 text-[12px] text-accent">
                    #{data.profile.worldRank} no ranking global
                  </p>
                )}
              </div>
              {data.profile.favoriteLanguage && LANGUAGES[data.profile.favoriteLanguage] && (
                <button
                  onClick={onOpenRanking}
                  className="flex shrink-0 items-center gap-2 rounded-md border border-white/[0.08] px-3 py-1.5 transition-colors hover:border-white/[0.16]"
                  title="Ver ranking"
                >
                  <img
                    src={deviconUrl(LANGUAGES[data.profile.favoriteLanguage].icon)}
                    alt=""
                    className="size-4"
                    draggable={false}
                    width={16}
                    height={16}
                  />
                  <span className="text-[12px] text-zinc-300">favorita</span>
                </button>
              )}
            </div>
          </motion.section>

          {/* Metrics */}
          <motion.section
            {...screenMotion}
            transition={{ duration: 0.4, ease: EASE, delay: 0.05 }}
            className="mt-8"
          >
            <MetricStrip
              items={[
                ["Corridas", String(data.profile.totalRaces)],
                ["Melhor PPM", String(data.profile.bestWpm), { accent: true }],
                ["Precisão máx", `${data.profile.bestAccuracy}%`],
                ["Linguagens", String(data.profile.languagesPracticed)],
              ]}
            />
          </motion.section>

          {/* Achievements */}
          <section className="mt-9">
            <SectionHead title="Conquistas" meta={`${data.unlockedAchievements}/${data.achievements.length}`} caption="Coleção do jogador." />
            <div className="mt-4 flex flex-wrap gap-2">
              {data.achievements.slice(0, 12).map((a) => (
                <span
                  key={a.id}
                  title={a.title}
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full border",
                    a.unlocked
                      ? "border-accent/30 bg-accent-soft text-accent"
                      : "border-white/[0.08] bg-white/[0.015] text-zinc-600"
                  )}
                >
                  <AchievementGlyph icon={a.icon} locked={!a.unlocked} />
                </span>
              ))}
            </div>
          </section>

          {/* History */}
          <section className="mt-9">
            <SectionHead title="Histórico" />
            <div className="mt-3 flex flex-col">
              {data.history.length === 0 && (
                <p className="text-[13px] text-zinc-500">Sem corridas ainda.</p>
              )}
              {data.history.map((r, i) => {
                const lang = r.language ? LANGUAGES[r.language] : null;
                return (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: Math.min(i * 0.03, 0.3) }}
                    className="flex items-center gap-4 border-b border-white/[0.05] py-3.5 last:border-b-0"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.015]">
                      {lang ? (
                        <img src={deviconUrl(lang.icon)} alt="" className="size-4" draggable={false} width={16} height={16} />
                      ) : (
                        <span className="font-mono text-[11px] text-zinc-600">?</span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-zinc-200">{lang?.name ?? "—"}</span>
                    <span className="shrink-0 font-mono text-[12.5px] tabular-nums text-zinc-400">
                      {r.wpm} PPM · {(r.accuracy * 100).toFixed(0)}% · {formatTime(r.elapsed)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}