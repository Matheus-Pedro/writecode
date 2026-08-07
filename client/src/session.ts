export interface ReplayFrame {
  t: number; // segundos
  chars: number; // caracteres corretos acumulados
  errors: number;
  wpm: number;
  backspaces: number;
}

export interface SessionData {
  frames: ReplayFrame[];
  wrongKeys: Record<string, number>; // letra errada -> contagem
  linesTyped: number;
  snippetKey: string; // fonte para o ghost
  startedAt: number;
}

export const session: SessionData = {
  frames: [],
  wrongKeys: {},
  linesTyped: 0,
  snippetKey: "",
  startedAt: 0,
};

export function resetSession() {
  session.frames = [];
  session.wrongKeys = {};
  session.linesTyped = 0;
  session.startedAt = performance.now();
}

export function bestGhostTimes(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem("wc_ghost_best") || "{}");
  } catch {
    return {};
  }
}

export function saveGhostTime(totalChars: number, elapsedSeconds: number) {
  const key = session.snippetKey;
  if (!key) return;
  const wpm = totalChars / 5 / (elapsedSeconds / 60 || 0.001);
  const best = bestGhostTimes();
  if (wpm > (best[key] || 0) || !(key in best)) {
    best[key] = wpm;
    localStorage.setItem("wc_ghost_best", JSON.stringify(best));
  }
}