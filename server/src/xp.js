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
