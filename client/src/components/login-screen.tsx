import { useState } from "react";
import { motion } from "framer-motion";
import { login, register, githubLoginUrl } from "../api";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Github, Close } from "./icons";
import type { User } from "../api";

interface Props {
  onClose: () => void;
  onLoggedIn: (user: User) => void;
}

export function LoginScreen({ onClose, onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const ghError = new URLSearchParams(window.location.search).get("auth_error") === "github";

  async function submit() {
    setError("");
    setBusy(true);
    try {
      const { user } = mode === "login" ? await login(email, password) : await register(email, password);
      onLoggedIn(user);
    } catch (e) {
      setError((e as Error).message || "Falha ao entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/70 p-4 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ duration: 0.18 }}
        className="w-full max-w-sm"
      >
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-zinc-100">
              {mode === "login" ? "Entrar na conta" : "Criar conta"}
            </h2>
            <button
              onClick={onClose}
              aria-label="Fechar"
              className="text-zinc-500 transition-colors hover:text-zinc-200"
            >
              <Close className="size-4" />
            </button>
          </div>

          <div className="mb-4 flex rounded-sm border border-white/[0.08] p-0.5">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                className={`flex-1 rounded-sm px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  mode === m ? "bg-white/[0.08] text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {m === "login" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>

          <div className="grid gap-2.5">
            <Input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {error && <p className="mt-3 text-[12.5px] text-red-400">{error}</p>}
          {ghError && (
            <p className="mt-3 text-[12.5px] text-red-400">Falha ao entrar com GitHub. Tente novamente.</p>
          )}

          <Button
            variant="primary"
            className="mt-4 w-full"
            disabled={busy || !email || !password}
            onClick={submit}
          >
            {busy ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </Button>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[11px] uppercase tracking-wide text-zinc-600">ou</span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>

          <Button variant="secondary" className="w-full" onClick={() => (window.location.href = githubLoginUrl())}>
            <Github className="size-4" />
            Continuar com GitHub
          </Button>

          <p className="mt-4 text-center text-[11.5px] leading-relaxed text-zinc-600">
            O login é necessário para usar a geração por IA.
          </p>
        </Card>
      </motion.div>
    </div>
  );
}