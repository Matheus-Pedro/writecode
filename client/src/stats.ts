export interface Stats {
  total: number;
  correct: number;
  errors: number;
  accuracy: number;
  cpm: number;
  wpm: number;
  elapsed: number;
}

export function buildStats(typed: string[], target: string, elapsedSeconds: number): Stats {
  const total = typed.length;
  let correct = 0;
  for (let i = 0; i < total; i++) {
    if (typed[i] === target[i]) correct++;
  }
  const errors = total - correct;
  const accuracy = total > 0 ? correct / total : 1;
  const minutes = elapsedSeconds > 0 ? elapsedSeconds / 60 : 0.001;
  const cpm = correct / minutes;
  const wpm = cpm / 5;
  return { total, correct, errors, accuracy, cpm, wpm, elapsed: elapsedSeconds };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function rankLabel(wpm: number): string {
  if (wpm >= 80) return "Velocidade profissional";
  if (wpm >= 55) return "Muito rápido";
  if (wpm >= 35) return "Bom ritmo";
  if (wpm >= 20) return "Em desenvolvimento";
  return "Aquecendo";
}
