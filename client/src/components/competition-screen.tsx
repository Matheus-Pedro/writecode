import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LANGUAGES, LANGUAGE_ORDER, deviconUrl } from "../languages";
import {
  createRoom,
  finishRoom,
  getRoom,
  joinRoom,
  listRoomsPublic,
  playAgain,
  postRoomProgress,
  startRoom,
  type Room,
} from "../api";
import { buildStats, formatTime, type Stats } from "../stats";
import { CodeDisplay } from "./code-display";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Close, Loader, Restart, Terminal } from "./icons";
import {
  PageShell,
  BackBar,
  Eyebrow,
  SectionHead,
  Row,
  SkeletonList,
  EmptyState,
  Segmented,
  EASE,
} from "./design-system";
import { cn } from "../lib/utils";

type View = "menu" | "lobby" | "race" | "results";

interface Props {
  user: { name: string | null; avatarUrl: string | null } | null;
  onBack: () => void;
  onRequestLogin: () => void;
}

const POLL_MS = 1800;

interface PublicRoom {
  code: string;
  language: string;
  players: number;
  host: string;
}

export function CompetitionScreen({ user, onBack, onRequestLogin }: Props) {
  const [view, setView] = useState<View>("menu");
  const [room, setRoom] = useState<Room | null>(null);
  const [language, setLanguage] = useState<string>(LANGUAGE_ORDER[0]);
  const [type, setType] = useState<"public" | "private">("public");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [roomsError, setRoomsError] = useState(false);

  const poll = useCallback(async () => {
    if (!room) return;
    try {
      const next = await getRoom(room.code);
      setRoom(next);
      if (next.state !== "lobby" && (next.state === "countdown" || next.state === "racing")) {
        setView("race");
      } else if (next.state === "finished") {
        setView("results");
      }
    } catch {}
  }, [room]);

  useEffect(() => {
    if (!room || view === "race") return;
    const id = setInterval(poll, POLL_MS);
    return () => clearInterval(id);
  }, [room, view, poll]);

  const refreshRooms = useCallback(async () => {
    setRoomsLoading(true);
    setRoomsError(false);
    try {
      const r = await listRoomsPublic();
      setPublicRooms(r.rooms);
    } catch {
      setRoomsError(true);
    } finally {
      setRoomsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === "menu") refreshRooms();
  }, [view, refreshRooms]);

  async function handleCreate() {
    if (!user) return onRequestLogin();
    setBusy(true);
    setError("");
    try {
      const r = await createRoom(language, type);
      setRoom(r);
      setView("lobby");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar sala.");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(code?: string) {
    if (!user) return onRequestLogin();
    setBusy(true);
    setError("");
    try {
      const target = (code ?? joinCode).trim();
      const r = await joinRoom(target);
      setRoom(r);
      setView("lobby");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao entrar na sala.");
    } finally {
      setBusy(false);
    }
  }

  function leave() {
    setRoom(null);
    setError("");
    setView("menu");
  }

  if (view === "menu") {
    return (
      <PageShell>
        <BackBar onBack={onBack} />
        <Eyebrow>Modo de jogo</Eyebrow>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Competição ao vivo</h1>
        <p className="mt-2 max-w-md text-[13.5px] leading-relaxed text-zinc-400">
          Dispute a digitação do mesmo trecho de código em tempo real com outros jogadores.
        </p>

        {/* Public rooms */}
        <section className="mt-9">
          <SectionHead
            title="Partidas públicas"
            caption="Salas abertas esperando jogadores."
            meta={
              <button onClick={refreshRooms} className="font-mono text-[11px] uppercase tracking-[0.1em] text-zinc-500 transition-colors hover:text-zinc-200">
                {roomsLoading ? "atualizando…" : "atualizar"}
              </button>
            }
          />
          <div className="mt-3">
            {roomsLoading && <SkeletonList rows={3} icon={false} />}
            {!roomsLoading && roomsError && <EmptyState title="Falha ao buscar salas" body="Tente atualizar novamente." />}
            {!roomsLoading && !roomsError && publicRooms.length === 0 && (
              <EmptyState title="Nenhuma sala aberta" body="Crie uma sala pública abaixo para começar." />
            )}
            {!roomsLoading && !roomsError && publicRooms.length > 0 && (
              <div className="flex flex-col">
                {publicRooms.map((r, i) => {
                  const lang = LANGUAGES[r.language];
                  return (
                    <motion.div
                      key={r.code}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, ease: EASE, delay: i * 0.03 }}
                    >
                      <Row className="items-center">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.015]">
                          {lang ? (
                            <img src={deviconUrl(lang.icon)} alt="" className="size-4" draggable={false} width={16} height={16} />
                          ) : (
                            <span className="font-mono text-[11px] text-zinc-600">?</span>
                          )}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13.5px] text-zinc-200">{lang?.name ?? r.language}</p>
                          <p className="truncate text-[12px] text-zinc-500">
                            {r.host} · <span className="font-mono tabular-nums">{r.players}/20</span> jogadores
                          </p>
                        </div>
                        <Button variant="secondary" size="sm" onClick={() => handleJoin(r.code)} disabled={busy}>
                          <Terminal className="size-3.5" />
                          Entrar
                        </Button>
                      </Row>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {error && (
          <p className="mt-4 rounded-sm border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[13px] text-red-400">
            {error}
          </p>
        )}

        {/* Create */}
        <section className="mt-9 flex flex-col gap-5">
          <SectionHead title="Criar sala" />
          <div>
            <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
              Linguagem
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGE_ORDER.map((id) => {
                const lang = LANGUAGES[id];
                const active = language === id;
                return (
                  <button
                    key={id}
                    onClick={() => setLanguage(id)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors duration-150",
                      active
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

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label className="mb-2 block text-[11px] font-medium uppercase tracking-[0.1em] text-zinc-500">
                Tipo de sala
              </label>
              <Segmented
                value={type}
                onChange={setType}
                options={[
                  { id: "public", label: "Pública" },
                  { id: "private", label: "Privada" },
                ]}
              />
            </div>
            <Button variant="primary" onClick={handleCreate} disabled={busy}>
              {busy ? <Loader className="size-4" /> : <Terminal className="size-4" />}
              Criar sala
            </Button>
          </div>
        </section>

        {/* Join by code */}
        <section className="mt-9 border-t border-white/[0.06] pt-8">
          <SectionHead title="Entrar por código" caption="Você recebeu o código de uma sala privada." />
          <div className="mt-4 flex max-w-sm gap-2">
            <Input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="ABF7K"
              className="font-mono uppercase tracking-[0.2em]"
              maxLength={5}
            />
            <Button onClick={() => handleJoin()} disabled={busy || joinCode.trim().length !== 5}>
              Entrar
            </Button>
          </div>
        </section>
      </PageShell>
    );
  }

  if (view === "lobby" && room) {
    const lang = LANGUAGES[room.language];
    const hostId = room.hostId;
    const isHost = room.self?.isHost ?? false;
    return (
      <Lobby
        room={room}
        lang={lang}
        isHost={isHost}
        hostId={hostId}
        onStart={async () => {
          try {
            const r = await startRoom(room.code);
            setRoom(r);
            setView("race");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível iniciar.");
          }
        }}
        onLeave={leave}
      />
    );
  }

  if (view === "race" && room) {
    return (
      <Race
        room={room}
        onFinish={(r) => {
          setRoom(r);
          setView("results");
        }}
        onBack={leave}
      />
    );
  }

  if (view === "results" && room) {
    return (
      <Results
        room={room}
        isHost={room.self?.isHost ?? false}
        onAgain={async () => {
          try {
            const r = await playAgain(room.code, room.language);
            setRoom(r);
            setView("lobby");
          } catch (e) {
            setError(e instanceof Error ? e.message : "Não foi possível reiniciar.");
          }
        }}
        onLeave={leave}
      />
    );
  }

  return null;
}

function Lobby({
  room,
  lang,
  isHost,
  hostId,
  onStart,
  onLeave,
}: {
  room: Room;
  lang: { name: string };
  isHost: boolean;
  hostId: number;
  onStart: () => void;
  onLeave: () => void;
}) {
  const finished = room.players.filter((p) => p.finished).length;
  return (
    <PageShell>
      <BackBar onBack={onLeave}>
        <span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 font-mono text-[13px] font-semibold tracking-[0.15em] text-accent">
          #{room.code}
        </span>
      </BackBar>
      <Eyebrow>Sala de partida</Eyebrow>
      <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">{lang.name}</h1>
      <p className="mt-2 text-[13px] text-zinc-400">
        {room.type === "private" ? "Privada" : "Pública"} ·{" "}
        <span className="font-mono tabular-nums">{room.players.length}/20</span> jogadores · {finished} concluídos
      </p>

      <div className="mt-8 flex flex-col">
        {room.players.map((p) => (
          <Row key={p.userId}>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-ink-950"
              style={{ backgroundColor: p.color }}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" width={32} height={32} />
              ) : (
                p.name?.slice(0, 1).toUpperCase() || "?"
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-zinc-200">
              {p.name}
              {p.isHost && <span className="ml-2 text-[10.5px] text-accent">host</span>}
              {p.userId === room.self?.userId && (
                <span className="ml-2 text-[10.5px] text-zinc-500">(você)</span>
              )}
            </span>
            <span className={cn("text-[11px]", p.ready ? "text-accent" : "text-zinc-500")}>
              {p.ready ? "pronto" : "aguardando"}
            </span>
          </Row>
        ))}
      </div>

      <p className="mt-4 text-center font-mono text-[12px] text-zinc-600">
        Compartilhe o código <span className="font-semibold text-zinc-400">{room.code}</span> para convidar amigos
      </p>

      <div className="mt-8">
        {isHost ? (
          <Button variant="primary" size="lg" onClick={onStart} className="w-full">
            Começar partida
          </Button>
        ) : (
          <p className="text-center text-[13px] text-zinc-500">
            Aguardando o host {hostId !== room.self?.userId && ""}começar…
          </p>
        )}
      </div>
    </PageShell>
  );
}

function Race({ room, onFinish, onBack }: { room: Room; onFinish: (r: Room) => void; onBack: () => void }) {
  const target = room.snippet.code;
  const [typed, setTyped] = useState<string[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const startRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const code = room.code;

  const current = buildStats(typed, target, elapsed);
  const progress = Math.min(100, (typed.length / target.length) * 100);

  useEffect(() => {
    const startAt = room.startAt ? Number(room.startAt) : Date.now() + 100;
    const tick = () => {
      const rem = Math.ceil((startAt - Date.now()) / 1000);
      setCountdown(rem);
      if (rem <= 0 && startRef.current === null) startRef.current = performance.now();
    };
    tick();
    const id = setInterval(tick, 120);
    return () => clearInterval(id);
  }, [room.startAt]);

  useEffect(() => {
    const id = setInterval(() => {
      if (startRef.current !== null && !doneRef.current) {
        setElapsed((performance.now() - startRef.current) / 1000);
      }
    }, 250);
    return () => clearInterval(id);
  }, []);

  const report = useCallback(() => {
    if (doneRef.current || startRef.current === null) return;
    postRoomProgress(code, {
      progress: Math.min(100, (typed.length / target.length) * 100),
      cpm: current.cpm,
      accuracy: current.accuracy,
      errors: current.errors,
    }).catch(() => {});
  }, [code, typed.length, target.length, current.cpm, current.accuracy, current.errors]);

  useEffect(() => {
    const id = setInterval(report, 1200);
    return () => clearInterval(id);
  }, [report]);

  useEffect(() => {
    if (typed.length >= target.length && !doneRef.current && startRef.current !== null) {
      doneRef.current = true;
      const secs = (performance.now() - startRef.current) / 1000;
      setElapsed(secs);
      setFinished(true);
      const s: Stats = buildStats(typed, target, secs);
      finishRoom(code, { cpm: s.cpm, accuracy: s.accuracy, errors: s.errors, elapsed: s.elapsed })
        .then((r) => onFinish(r))
        .catch(() => onFinish(room));
    }
  }, [typed, target, code, room, onFinish]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (doneRef.current || startRef.current === null) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Backspace") {
        e.preventDefault();
        setTyped((t) => t.slice(0, -1));
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setTyped((t) => [...t, " ", " ", " ", " "]);
        return;
      }
      let ch: string | null = null;
      if (e.key === "Enter") ch = "\n";
      else if (e.key.length === 1) ch = e.key;
      else return;
      e.preventDefault();
      setTyped((t) => {
        if (t.length >= target.length) return t;
        return [...t, ch!];
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [target.length]);

  useEffect(() => {
    caretRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [typed.length]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 pt-[4vh]">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          Sair
        </Button>
        <span className="rounded-full border border-accent/25 bg-accent-soft px-3 py-1 font-mono text-[12px] font-semibold tracking-[0.15em] text-accent">
          #{room.code}
        </span>
      </div>

      {finished ? (
        <div className="flex flex-col items-center gap-2 py-12 text-zinc-200">
          <Loader className="size-6 text-accent" />
          <p className="text-[14px]">Corrida concluída — aguardando os demais jogadores…</p>
        </div>
      ) : countdown !== null && countdown > 0 ? (
        <div className="flex flex-col items-center gap-2 py-12">
          <motion.span
            key={countdown}
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-[64px] font-bold leading-none text-accent"
          >
            {countdown}
          </motion.span>
          <span className="text-[13px] text-zinc-500">Prepare-se para digitar…</span>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex w-full items-stretch gap-0 overflow-hidden rounded-md border border-white/[0.06] bg-ink-900 sm:w-auto">
              <Stat label="PPM" value={current.wpm.toFixed(0)} accent />
              <Stat label="Precisão" value={`${(current.accuracy * 100).toFixed(1)}%`} />
              <Stat label="Erros" value={String(current.errors)} />
              <Stat label="Tempo" value={formatTime(elapsed)} />
            </div>
            <div className="flex w-full items-stretch gap-0 overflow-hidden rounded-md border border-white/[0.06] bg-ink-900 sm:w-auto">
              <Stat label="Progresso" value={`${progress.toFixed(0)}%`} accent />
            </div>
          </div>

          <div className="h-[2px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              className="h-full bg-accent"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
          </div>

          <div className="overflow-hidden rounded-lg border border-white/[0.08] bg-ink-900">
            <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-2.5">
              <span className="truncate font-mono text-[11px] text-zinc-600">{room.snippet.source}</span>
              <span className="ml-4 shrink-0 font-mono text-[11px] text-zinc-500">
                {typed.length}/{target.length}
              </span>
            </div>
            <CodeDisplay target={target} typed={typed} caretRef={caretRef} />
          </div>
        </div>
      )}

      <div className="mt-1 flex flex-col">
        {room.players.map((p) => (
          <Row key={p.userId} className="py-3">
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-ink-950"
              style={{ backgroundColor: p.color }}
            >
              {p.name?.slice(0, 1).toUpperCase() || "?"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[12.5px] text-zinc-300">{p.name}</span>
            {p.finished ? (
              <span className="shrink-0 text-[11px] font-semibold text-accent">✓ {p.rank ? `${p.rank}º` : "fez"}</span>
            ) : (
              <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${p.progress}%`, backgroundColor: p.color }}
                />
              </div>
            )}
            {p.progress > 0 && !p.finished && (
              <span className="w-9 shrink-0 text-right font-mono text-[10.5px] tabular-nums text-zinc-500">
                {p.progress.toFixed(0)}%
              </span>
            )}
          </Row>
        ))}
      </div>

      <p className="mt-2 text-center text-[11px] text-zinc-600">
        O progresso e as métricas são atualizados em tempo real com os demais jogadores.
      </p>
    </div>
  );
}

function Results({ room, isHost, onAgain, onLeave }: { room: Room; isHost: boolean; onAgain: () => void; onLeave: () => void }) {
  const ranked = [...room.players].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
  return (
    <PageShell>
      <div className="mb-8 text-center">
        <Eyebrow>Corrida concluída</Eyebrow>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-zinc-50">Resultado</h1>
        <p className="mt-1 text-[13px] text-zinc-500">Sala #{room.code}</p>
      </div>

      <div className="flex flex-col">
        {ranked.map((p) => (
          <Row
            key={p.userId}
            className={cn(
              "px-3",
              p.userId === room.self?.userId && "rounded-lg border border-accent/30 bg-accent-soft/[0.06]"
            )}
          >
            <span className="w-7 shrink-0 text-center">
              {p.rank ? (
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-md border font-mono text-[11px] font-semibold",
                    p.rank === 1
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-white/[0.1] bg-white/[0.02] text-zinc-400"
                  )}
                >
                  {p.rank}
                </span>
              ) : (
                <span className="font-mono text-[12px] tabular-nums text-zinc-600">—</span>
              )}
            </span>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold text-ink-950"
              style={{ backgroundColor: p.color }}
            >
              {p.avatarUrl ? (
                <img src={p.avatarUrl} alt="" className="size-8 rounded-full" referrerPolicy="no-referrer" width={32} height={32} />
              ) : (
                p.name?.slice(0, 1).toUpperCase() || "?"
              )}
            </span>
            <span className="min-w-0 flex-1 truncate text-[14px] text-zinc-200">
              {p.name}
              {p.userId === room.self?.userId && <span className="ml-2 text-[10.5px] text-zinc-500">(você)</span>}
            </span>
            <div className="shrink-0 text-right">
              <span className="block font-mono text-[13px] font-semibold tabular-nums text-zinc-100">
                {p.finished ? p.score : "—"} pts
              </span>
              {p.finished && (
                <span className="block text-[10px] tabular-nums text-zinc-500">
                  {p.cpm.toFixed(0)} CPM · {(p.accuracy * 100).toFixed(1)}% · {p.errors} erros · {formatTime(p.elapsed)}
                </span>
              )}
            </div>
          </Row>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-2 sm:flex-row">
        <Button variant="primary" size="lg" className="flex-1" onClick={onAgain} disabled={!isHost}>
          <Restart className="size-4" />
          {isHost ? "Jogar novamente" : "Aguardando host reiniciar…"}
        </Button>
        <Button size="lg" onClick={onLeave}>
          <Close className="size-4" />
          Sair
        </Button>
      </div>
    </PageShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center px-4 py-1.5">
      <span
        className={cn(
          "font-mono text-[15px] font-semibold tabular-nums",
          accent ? "text-accent-hover" : "text-zinc-100"
        )}
      >
        {value}
      </span>
      <span className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-zinc-600">{label}</span>
    </div>
  );
}