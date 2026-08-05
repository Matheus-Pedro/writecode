import { useEffect, useRef } from "react";
import { cn } from "../lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AD_CLIENT = "ca-pub-1682840359628553";
const AD_SCRIPT = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${AD_CLIENT}`;

let scriptLoaded = false;

function loadAdScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) return resolve();
    if (document.querySelector('script[src*="pagead/js/adsbygoogle.js"]')) {
      scriptLoaded = true;
      return resolve();
    }
    const s = document.createElement("script");
    s.src = AD_SCRIPT;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
}

interface Props {
  slot: string;
  format?: string;
  className?: string;
}

export function AdUnit({ slot, format = "auto", className }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const shown = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current) return;
    let cancelled = false;

    function show() {
      if (cancelled || shown.current) return;
      shown.current = true;
      loadAdScript().then(() => {
        if (cancelled) return;
        try {
          window.adsbygoogle = window.adsbygoogle || [];
          window.adsbygoogle.push({});
        } catch {}
      });
    }

    if (typeof IntersectionObserver !== "undefined") {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) {
            show();
            io.disconnect();
          }
        },
        { rootMargin: "200px" }
      );
      io.observe(el);
      return () => {
        cancelled = true;
        io.disconnect();
      };
    }

    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(show, { timeout: 2000 })
        : window.setTimeout(show, 2000);
    return () => {
      cancelled = true;
      if ("requestIdleCallback" in window) {
        window.cancelIdleCallback(idle as number);
      } else {
        clearTimeout(idle as ReturnType<typeof setTimeout>);
      }
    };
  }, [slot]);

  return (
    <div ref={ref} className={cn("flex w-full justify-center", className)}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", minHeight: 90 }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
