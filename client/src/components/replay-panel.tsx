import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { session, bestGhostTimes } from "../session";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Play, Restart, TrendingUp } from "./icons";
import { cn } from "../lib/utils";

const W = 520;
const H = 120;
const PAD = 8;

export function ReplayPanel() {
  const { frames } = session;
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  if (frames.length < 2) return null;
  const duration = frames[frames.length - 1].t || 1;
  const maxWpm = Math.max(1, ...frames.map((f) => f.wpm));
  const last = frames[frames.length - 1];
  const avgSecPerLine = duration / Math.max(1, session.linesTyped || 1);

  const best = bestGhostTimes();
  const ghostWpm = best[session.snippetKey];
  const beatGhost = ghostWpm ? last.wpm >= ghostWpm : null;
  const topWrong = Object.entries(session.wrongKeys).sort((a, b) => b[1] - a[1]).slice(0, 6);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= duration) {
          setPlaying(false);
          return duration;
        }
        return p + 0.08;
      });
    }, 90);
    return () => clearInterval(id);
  }, [playing, duration]);

  const innerH = H - 2 * PAD;
  const x = (i: number) => PAD + (i / (frames.length - 1)) * (W - 2 * PAD);
  const y = (wpm: number) => PAD + innerH * (1 - wpm / maxWpm);
  const path = frames.map((f, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(f.wpm)}`).join(" ");

  const playAt = (progress / duration) * (frames.length - 1);
  const caretIndex = Math.min(frames.length - 1, Math.max(0, Math.round(playAt)));
  const caretX = x(caretIndex);
  const caretY = y(frames[caretIndex].wpm);
  const ghostY = ghostWpm ? y(Math.min(ghostWpm, maxWpm)) : 0;

  return (
    <Card className="w-full p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-accent" />
          <h3 className="text-[13px] font-semibold text-zinc-200">Replay da corrida</h3>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            if (playing) {
              setPlaying(false);
            } else {
              setProgress(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? <Restart className="size-4" /> : <Play className="size-4" />}
          {playing ? "Parar" : "Reproduzir"}
        </Button>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Variação de velocidade ao longo do tempo">
        <path d={path} fill="none" stroke="#a78bfa" strokeWidth="2" />
        {ghostWpm != null && (
          <>
            <line
              x1={PAD}
              y1={ghostY}
              x2={W - PAD}
              y2={ghostY}
              stroke="#f472b6"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <text x={PAD + 2} y={ghostY - 3} fill="#f472b6" fontSize="9">
              ghost {ghostWpm.toFixed(0)} PPM
            </text>
          </>
        )}
        {playing && (
          <>
            <line x1={caretX} y1={PAD} x2={caretX} y2={H - PAD} stroke="#e4e4e7" strokeWidth="1" />
            <circle cx={caretX} cy={caretY} r="3.5" fill="#fff" />
          </>
        )}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10.5px] text-zinc-500">
        <span>0s</span>
        {playing && <motion.span layout className="font-mono text-zinc-200">{frames[caretIndex].t.toFixed(1)}s</motion.span>}
        <span className="font-mono text-accent">{last.wpm.toFixed(0)} PPM</span>
        <span>{duration.toFixed(1)}s</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Velocidade média", `${last.wpm.toFixed(0)} PPM`],
          ["Erros", String(last.errors)],
          ["Backspaces", String(last.backspaces)],
          ["Tempo/linha", `${avgSecPerLine.toFixed(1)}s`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-md border border-white/[0.05] bg-white/[0.01] px-3 py-2">
            <span className="block font-mono text-[15px] font-semibold text-zinc-100">{v}</span>
            <span className="text-[9.5px] font-medium uppercase tracking-[0.08em] text-zinc-600">{k}</span>
          </div>
        ))}
      </div>

      {ghostWpm != null && (
        <div
          className={cn(
            "mt-3 flex items-center gap-2 rounded-md border px-3 py-2 text-[12.5px]",
            beatGhost
              ? "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300"
              : "border-amber-400/30 bg-amber-400/[0.06] text-amber-300"
          )}
        >
          <span className="size-2 shrink-0 rounded-full bg-pink-400" />
          {beatGhost
            ? `Você superou seu recorde de ${ghostWpm.toFixed(0)} PPM nesse trecho!`
            : `Recorde pessoal: ${ghostWpm.toFixed(0)} PPM. Tente bater!`}
        </div>
      )}

      {topWrong.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-zinc-500">
            Caracteres/tokens mais errados
          </p>
          <div className="flex flex-wrap gap-1.5">
            {topWrong.map(([k, n]) => (
              <span
                key={k}
                className="flex items-center gap-1 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1 font-mono text-[12px] text-zinc-300"
              >
                {k}
                <span className="text-[10px] text-red-400">×{n}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}