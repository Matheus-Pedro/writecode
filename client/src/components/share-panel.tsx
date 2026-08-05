import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { drawShareCard, shareText, shareUrls, downloadShareCard, type ShareStats } from "../share";
import { Button } from "./ui/button";
import { Loader } from "./icons";

export function SharePanel({ stats }: { stats: ShareStats }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [preview, setPreview] = useState<string>("");
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    drawShareCard(canvasRef.current!, stats)
      .then(() => {
        if (!alive) return;
        setPreview(canvasRef.current!.toDataURL("image/png"));
      })
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [stats]);

  const text = shareText(stats);
  const links = shareUrls(text);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  const items = [
    { label: "WhatsApp", color: "#25D366", href: links.whatsapp, Icon: WhatsAppIcon },
    { label: "X", color: "#fff", href: links.twitter, Icon: XIcon },
    { label: "LinkedIn", color: "#0A66C2", href: links.linkedin, Icon: LinkedInIcon },
    { label: "Telegram", color: "#2AABEE", href: links.telegram, Icon: TelegramIcon },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-8 w-full"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-zinc-200">Compartilhar resultado</h2>
        <span className="text-[11px] text-zinc-600">baixe a imagem ou compartilhe</span>
      </div>

      <div className="relative aspect-[1200/620] w-full overflow-hidden rounded-md border border-white/[0.08] bg-ink-900">
        {busy ? (
          <div className="flex h-full items-center justify-center gap-2 text-zinc-500">
            <Loader className="size-4 animate-spin" />
            Gerando imagem…
          </div>
        ) : preview ? (
          <img src={preview} alt="Card do resultado" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <canvas ref={canvasRef} className="hidden" />

      <div className="mt-3 grid grid-cols-4 gap-2">
        {items.map(({ label, color, href, Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex h-9 items-center justify-center gap-1.5 rounded-sm border border-white/10 bg-white/[0.03] text-[12.5px] font-medium text-zinc-300 transition-colors hover:border-white/[0.18] hover:bg-white/[0.07]"
          >
            <Icon className="size-4" style={{ color }} />
            <span className="hidden sm:inline">{label}</span>
          </a>
        ))}
      </div>

      <div className="mt-2.5 flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => downloadShareCard(canvasRef.current!)} disabled={!preview}>
          Baixar imagem
        </Button>
        <Button variant="secondary" className="flex-1" onClick={copy}>
          {copied ? "Copiado!" : "Copiar texto"}
        </Button>
      </div>
    </motion.div>
  );
}

type IconProps = { className?: string; style?: React.CSSProperties };

function WhatsAppIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
    </svg>
  );
}

function XIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452z" />
    </svg>
  );
}

function TelegramIcon({ className, style }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor" aria-hidden>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}