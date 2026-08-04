import { useEffect, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { HomeScreen } from "./components/home-screen";
import { SetupScreen } from "./components/setup-screen";
import { TypingScreen } from "./components/typing-screen";
import { ResultsScreen } from "./components/results-screen";
import { Logo } from "./components/motion";
import { getConfig, type SnippetData } from "./api";
import type { Stats } from "./stats";

type Phase = "home" | "setup" | "typing" | "results";

const screenMotion = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] as const },
};

export default function App() {
  const [phase, setPhase] = useState<Phase>("home");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [language, setLanguage] = useState("");
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [typingKey, setTypingKey] = useState(0);

  useEffect(() => {
    getConfig()
      .then((c) => setAiEnabled(Boolean(c.aiEnabled)))
      .catch(() => setAiEnabled(false));
  }, []);

  function startTyping(lang: string, snip: SnippetData) {
    setLanguage(lang);
    setSnippet(snip);
    setStats(null);
    setTypingKey((k) => k + 1);
    setPhase("typing");
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative min-h-screen bg-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(139,124,246,0.08),transparent)]"
        />
        <header className="relative z-10">
          <div className="mx-auto flex h-14 w-full max-w-shell items-center px-6">
            <Logo />
          </div>
        </header>
        <main className="relative z-10 pb-24">
          <AnimatePresence mode="wait">
            <motion.div key={phase} {...screenMotion}>
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
                  onBack={() => setPhase("home")}
                  onStart={startTyping}
                />
              )}
              {phase === "typing" && snippet && (
                <TypingScreen
                  key={typingKey}
                  language={language}
                  snippet={snippet}
                  onFinish={(s) => {
                    setStats(s);
                    setPhase("results");
                  }}
                  onChangeLanguage={() => setPhase("home")}
                  onNewSnippet={() => setPhase("setup")}
                />
              )}
              {phase === "results" && snippet && stats && (
                <ResultsScreen
                  language={language}
                  snippet={snippet}
                  stats={stats}
                  onRetry={() => {
                    setTypingKey((k) => k + 1);
                    setPhase("typing");
                  }}
                  onNewSnippet={() => setPhase("setup")}
                  onChangeLanguage={() => setPhase("home")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </MotionConfig>
  );
}
