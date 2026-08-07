import { useEffect, useState } from "react";
import { getMe, updateName, type User } from "../api";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Loader, Settings } from "./icons";
import { PageShell, BackBar, Eyebrow } from "./design-system";

export function SettingsScreen({
  onBack,
  onUserChange,
}: {
  onBack: () => void;
  onUserChange: (u: User | null) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getMe()
      .then((r) => {
        if (r.user) {
          setName(r.user.name || "");
          setEmail(r.user.email);
        }
      })
      .catch(() => {});
  }, []);

  async function save() {
    const value = name.trim();
    if (!value) {
      setError("Informe um nome.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { user: updated } = await updateName(value);
      onUserChange(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell>
      <BackBar onBack={onBack} />
      <Eyebrow>Conta</Eyebrow>
      <h1 className="mt-2 flex items-center gap-2 text-[22px] font-semibold tracking-tight text-zinc-50">
        <Settings className="size-5 text-accent" />
        Configurações
      </h1>
      <p className="mt-2 text-[13.5px] text-zinc-400">Edite os dados da sua conta pública.</p>

      <Card className="mt-9 p-5">
        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
          Nome de exibição
        </label>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Como você aparece no ranking"
            aria-label="Nome de exibição"
          />
          <Button variant="primary" onClick={save} disabled={busy}>
            {busy ? <Loader className="size-4" /> : saved ? "Salvo" : "Salvar"}
          </Button>
        </div>
        {error && <p className="mt-2 text-[12.5px] text-red-400">{error}</p>}
        {email && (
          <p className="mt-3 border-t border-white/[0.06] pt-3 font-mono text-[11.5px] text-zinc-600">{email}</p>
        )}
      </Card>
    </PageShell>
  );
}