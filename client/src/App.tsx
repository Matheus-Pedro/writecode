import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { HomeScreen } from "./components/home-screen";
import { SetupScreen } from "./components/setup-screen";
import { TypingScreen } from "./components/typing-screen";
import { ResultsScreen } from "./components/results-screen";
import { HistoryScreen } from "./components/history-screen";
import { LoginScreen } from "./components/login-screen";
import { CompetitionScreen } from "./components/competition-screen";
import { DailyScreen } from "./components/daily-screen";
import { AchievementsScreen, RankingScreen } from "./components/achievements-screen";
import { ProfileScreen } from "./components/profile-screen";
import { InterviewScreen } from "./components/interview-screen";
import { SurvivalScreen } from "./components/survival-screen";
import { StatsScreen } from "./components/stats-screen";
import { SettingsScreen } from "./components/settings-screen";
import { ErrorBoundary } from "./components/error-boundary";
import { Logo } from "./components/motion";
import { getConfig, getMe, logout, saveResult, type SnippetData, type User, type LevelInfo } from "./api";
import { Button } from "./components/ui/button";
import { Settings } from "./components/icons";
import type { Stats } from "./stats";

type Phase =
  | "home"
  | "setup"
  | "typing"
  | "results"
  | "history"
  | "compete"
  | "daily"
  | "achievements"
  | "ranking"
  | "profile"
  | "interview"
  | "survival"
  | "stats"
  | "settings";

declare global {
  interface Window {
    __WRITECODE_CONFIG__?: { aiEnabled: boolean; languages?: string[] };
  }
}

const screenMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [language, setLanguage] = useState("");
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [typingKey, setTypingKey] = useState(0);
  const [xpGain, setXpGain] = useState<{ xpEarned: number; bonus: number; level: LevelInfo } | null>(null);
  const [profileRef, setProfileRef] = useState<string | number>(0);
  const [survivalMode, setSurvivalMode] = useState(false);

  useEffect(() => {
    const m = window.location.pathname.match(/^\/u\/([^/]+)/);
    if (m) {
      setProfileRef(decodeURIComponent(m[1]));
      setPhase("profile");
    }
  }, []);

  useEffect(() => {
    const cfg = window.__WRITECODE_CONFIG__;
    if (cfg && Array.isArray(cfg.languages)) {
      setAiEnabled(Boolean(cfg.aiEnabled));
    } else {
      getConfig()
        .then((c) => setAiEnabled(Boolean(c.aiEnabled)))
        .catch(() => setAiEnabled(false));
    }
    getMe()
      .then((r) => setUser(r.user))
      .catch(() => setUser(null));
  }, []);

  function startTyping(lang: string, snip: SnippetData, survival = false) {
    setLanguage(lang);
    setSnippet(snip);
    setStats(null);
    setTypingKey((k) => k + 1);
    setSurvivalMode(survival);
    setPhase("typing");
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(139,124,246,0.08),transparent)]"
        />
        <header className="relative z-10 border-b border-white/[0.04]">
          <div className="mx-auto flex h-14 w-full max-w-shell items-center justify-between gap-4 px-6">
            <Logo />
            {user ? (
              <div className="flex min-w-0 items-center gap-3">
                <nav className="scroll-slim flex min-w-0 items-center gap-1 overflow-x-auto">
                  {(
                    [
                      ["compete", "Competição"],
                      ["daily", "Desafio"],
                      ["ranking", "Ranking"],
                      ["interview", "Entrevista"],
                      ["survival", "Survival"],
                      ["stats", "Estatísticas"],
                      ["achievements", "Conquistas"],
                      ["history", "Histórico"],
                    ] as [Phase, string][]
                  ).map(([p, label]) => (
                    <Button
                      key={p}
                      variant="ghost"
                      size="sm"
                      onClick={() => setPhase(p)}
                      className="shrink-0 whitespace-nowrap"
                    >
                      {label}
                    </Button>
                  ))}
                </nav>

                <div className="flex shrink-0 items-center gap-2 border-l border-white/[0.06] pl-3">
                  <span className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1">
                    <svg viewBox="0 0 24 24" className="size-3.5 text-accent" fill="currentColor" aria-hidden>
                      <path d="M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5v-2l-10 5-10-5v2zm0-6 10 5 10-5" />
                    </svg>
                    <span className="font-mono text-[11.5px] font-semibold text-zinc-100">Lv {user.level}</span>
                    <span className="font-mono text-[11.5px] text-zinc-500">{user.xp} XP</span>
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setPhase("settings")} aria-label="Configurações">
                    <Settings className="size-4" />
                  </Button>
                  <button
                    onClick={() => {
                      setProfileRef(user.id);
                      setPhase("profile");
                    }}
                    className="flex min-w-0 items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors duration-150 hover:bg-white/[0.05]"
                    title="Meu perfil público"
                    aria-label="Abrir meu perfil público"
                  >
                    <span className="hidden max-w-[130px] truncate text-[12.5px] text-zinc-400 lg:inline">
                      {user.name || user.email}
                    </span>
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="size-6 rounded-full"
                        referrerPolicy="no-referrer"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-white/[0.08] text-[10px] font-semibold text-zinc-300">
                        {user.name?.slice(0, 1).toUpperCase() || "?"}
                      </span>
                    )}
                  </button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        await logout();
                      } finally {
                        setUser(null);
                        setShowLogin(false);
                      }
                    }}
                  >
                    Sair
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => setShowLogin(true)}>
                Entrar
              </Button>
            )}
          </div>
        </header>
        <main className="relative z-10 pb-24">
          <AnimatePresence mode="wait">
            <motion.div key={phase} {...screenMotion}>
              <ErrorBoundary onReset={() => setPhase("home")}>
              {phase === "home" && (
                <HomeScreen
                  onSelect={(id) => {
                    setLanguage(id);
                    setPhase("setup");
                  }}
                />
              )}
              {phase === "setup" && language && (
                <SetupScreen
                  language={language}
                  aiEnabled={aiEnabled}
                  loggedIn={Boolean(user)}
                  onBack={() => setPhase("home")}
                  onRequestLogin={() => setShowLogin(true)}
                  onStart={startTyping}
                />
              )}
              {phase === "typing" && snippet && (
                <TypingScreen
                  key={typingKey}
                  language={language}
                  snippet={snippet}
                  survival={survivalMode}
                  onFinish={(s) => {
                    setStats(s);
                    setPhase("results");
                    if (user) {
                      saveResult({
                        language,
                        source: snippet.source,
                        cpm: s.cpm,
                        wpm: s.wpm,
                        accuracy: s.accuracy,
                        errors: s.errors,
                        elapsed: s.elapsed,
                        sessionId: snippet.sessionId,
                        length: s.total,
                      })
                        .then((r) => {
                          setXpGain({ xpEarned: r.xpEarned, bonus: r.bonus, level: r.level });
                          setUser((u) =>
                            u ? { ...u, xp: r.level.xp, level: r.level.level } : u
                          );
                        })
                        .catch(() => {});
                    }
                  }}
                  onChangeLanguage={() => setPhase("home")}
                  onNewSnippet={() => setPhase("setup")}
                />
              )}
              {phase === "history" && (
                <HistoryScreen onBack={() => setPhase("home")} />
              )}
              {phase === "compete" && (
                <CompetitionScreen
                  user={user}
                  onBack={() => setPhase("home")}
                  onRequestLogin={() => setShowLogin(true)}
                />
              )}
              {phase === "daily" && (
                <DailyScreen
                  user={user}
                  onBack={() => setPhase("home")}
                  onRequestLogin={() => setShowLogin(true)}
                />
              )}
              {phase === "achievements" && <AchievementsScreen onBack={() => setPhase("home")} />}
              {phase === "ranking" && <RankingScreen onBack={() => setPhase("home")} onOpenProfile={(ref) => { setProfileRef(ref); setPhase("profile"); }} />}
              {phase === "profile" && (
                <ProfileScreen
                  userKey={profileRef}
                  onBack={() => setPhase("home")}
                  onOpenRanking={() => setPhase("ranking")}
                />
              )}
              {phase === "interview" && <InterviewScreen onBack={() => setPhase("home")} onStart={startTyping} />}
              {phase === "survival" && <SurvivalScreen onBack={() => setPhase("home")} onStart={(l, s) => startTyping(l, s, true)} />}
              {phase === "stats" && <StatsScreen onBack={() => setPhase("home")} />}
              {phase === "settings" && (
                <SettingsScreen onBack={() => setPhase("home")} onUserChange={setUser} />
              )}
              {phase === "results" && snippet && stats && (
                <ResultsScreen
                  language={language}
                  snippet={snippet}
                  stats={stats}
                  xpGain={xpGain}
                  onRetry={() => {
                    setTypingKey((k) => k + 1);
                    setPhase("typing");
                  }}
                  onNewSnippet={() => setPhase("setup")}
                  onChangeLanguage={() => setPhase("home")}
                />
              )}
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {showLogin && (
            <LoginScreen
              onClose={() => setShowLogin(false)}
              onLoggedIn={(u) => {
                setUser(u);
                setShowLogin(false);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </MotionConfig>
  );
}
