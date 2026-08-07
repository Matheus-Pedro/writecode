const BASE = 100;

export function cumulativeXp(level) {
  return (BASE * level * (level - 1)) / 2;
}

export function levelInfo(xp) {
  let level = 1;
  while (cumulativeXp(level + 1) <= xp) level++;
  const floor = cumulativeXp(level);
  const ceiling = cumulativeXp(level + 1);
  const into = xp - floor;
  const span = ceiling - floor;
  return { level, xp, into, needed: span, progress: span > 0 ? into / span : 1 };
}

export function xpForResult({ cpm, accuracy }) {
  return Math.max(1, Math.round(cpm * accuracy));
}

export const DAILY_BONUS = 25;

// Limites de integridade para resultados enviados pelo cliente.
// Um digitador real (recorde mundial ~280 PPM) fica longe destes tetos.
export const RESULT_CPM_MAX = 2000; // ~400 PPM absoluto
export const RESULT_WPM_MAX = 400;
export const RESULT_ACCURACY_MAX = 1.0005; // fração, não percentual
export const RESULT_ELAPSED_MIN = 0.2;
export const RESULT_ELAPSED_MAX = 3600;
export const CPM_WPM_TOLERANCE = 60; // |cpm - wpm*5| permitido (arredondamentos)
// Velocidade sustentada máxima plausível para um humano, em chars/seg.
// Automatizar via navegador termina o trecho instantaneamente, muito abaixo disso.
export const RESULT_MAX_CHARS_PER_SEC = 14; // ~168 PPM sustentado (artificial, acima de bots)
export const RESULT_MAX_ELAPSED_SKEW = 2; // segundos extras aceitos além do tempo real de sessão
// Teto de XP vindo de resultados por dia (anti grind; usuário legítimo não alcança).
export const RESULT_DAILY_XP_CAP = 2000;
// Rate limit por usuário em /api/results.
export const RESULT_RATE_BURST = 6;
export const RESULT_RATE_WINDOW = 10; // segundos
