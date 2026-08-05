const SANS = `"Inter Variable", "Inter", system-ui, sans-serif`;
const MONO = `"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace`;

const ACCENT = "#8B7CF6";
const INK_950 = "#0A0A0C";
const INK_900 = "#0F0F13";
const ZINC_400 = "#a1a1aa";
const ZINC_600 = "#52525b";
const ZINC_100 = "#f4f4f5";
const GREEN = "#65D982";

export interface ShareStats {
  wpm: number;
  accuracy: number;
  errors: number;
  elapsed: string;
  langName: string;
  icon: string;
  url: string;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadIcon(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function drawShareCard(canvas: HTMLCanvasElement, s: ShareStats): Promise<void> {
  const W = 1200;
  const H = 620;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  await Promise.all([
    document.fonts.load(`700 20px ${SANS}`),
    document.fonts.load(`600 168px ${MONO}`),
    document.fonts.load(`400 16px ${SANS}`),
  ]);

  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, INK_900);
  g.addColorStop(1, INK_950);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, -140, 0, W / 2, -140, 720);
  glow.addColorStop(0, "rgba(139,124,246,0.22)");
  glow.addColorStop(1, "rgba(139,124,246,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(139,124,246,0.35)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  const icon = s.icon
    ? await loadIcon(`https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${s.icon}/${s.icon}-original.svg`)
    : null;

  // Wordmark
  ctx.fillStyle = ACCENT;
  roundRect(ctx, 60, 56, 48, 48, 10);
  ctx.fill();
  ctx.fillStyle = INK_950;
  ctx.font = `700 26px ${MONO}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("w", 76, 82);

  ctx.fillStyle = ZINC_100;
  ctx.font = `600 20px ${SANS}`;
  ctx.fillText("writecode", 124, 82);

  ctx.fillStyle = ZINC_600;
  ctx.font = `400 15px ${SANS}`;
  ctx.fillText("treino de digitação de código", 124, 110);

  // Language badge (top right)
  if (icon) {
    roundRect(ctx, W - 232, 56, 172, 48, 10);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.drawImage(icon, W - 212, 68, 32, 32);
    ctx.fillStyle = ZINC_100;
    ctx.font = `600 18px ${SANS}`;
    ctx.fillText(s.langName, W - 170, 82);
  }

  // Big WPM
  ctx.fillStyle = ACCENT;
  ctx.fillRect(60, 288, 64, 6);
  ctx.fillStyle = ZINC_400;
  ctx.font = `500 15px ${SANS}`;
  ctx.fillText("palavras por minuto".toUpperCase(), 60, 272);

  ctx.fillStyle = ZINC_100;
  ctx.font = `600 168px ${MONO}`;
  ctx.fillText(String(Math.round(s.wpm)), 52, 420);

  ctx.fillStyle = ZINC_600;
  ctx.font = `600 24px ${SANS}`;
  ctx.fillText("PPM", 430, 300);

  // Stats row (bottom)
  const stats: Array<{ label: string; value: string; color?: string }> = [
    { label: "precisão", value: `${(s.accuracy * 100).toFixed(0)}%`, color: GREEN },
    { label: "erros", value: String(s.errors) },
    { label: "tempo", value: s.elapsed },
  ];
  let x = 60;
  const cy = 500;
  for (const st of stats) {
    ctx.fillStyle = st.color ?? ZINC_100;
    ctx.font = `600 36px ${MONO}`;
    ctx.fillText(st.value, x, cy);
    ctx.fillStyle = ZINC_600;
    ctx.font = `500 12px ${SANS}`;
    ctx.fillText(st.label.toUpperCase(), x, cy + 26);
    x += 230;
  }

  // Footer
  ctx.fillStyle = ZINC_600;
  ctx.font = `400 14px ${SANS}`;
  ctx.fillText(`Digite comigo em ${s.url}`, 60, 590);
}

export function shareText(s: ShareStats): string {
  return `Eu digitei ${Math.round(s.wpm)} PPM com ${(s.accuracy * 100).toFixed(0)}% de precisão em ${s.langName} no writecode! 🚀 ${s.url}`;
}

export function shareUrls(text: string) {
  const t = encodeURIComponent(text);
  const u = encodeURIComponent(window.location.origin);
  return {
    whatsapp: `https://wa.me/?text=${t}`,
    twitter: `https://twitter.com/intent/tweet?text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
  };
}

export function downloadShareCard(canvas: HTMLCanvasElement) {
  const a = document.createElement("a");
  a.href = canvas.toDataURL("image/png");
  a.download = "writecode-resultado.png";
  a.click();
}