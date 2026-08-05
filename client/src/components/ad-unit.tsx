import { useEffect } from "react";
import { cn } from "../lib/utils";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

const AD_CLIENT = "ca-pub-1682840359628553";

interface Props {
  slot: string;
  format?: string;
  className?: string;
}

export function AdUnit({ slot, format = "auto", className }: Props) {
  useEffect(() => {
    try {
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    } catch {}
  }, []);

  return (
    <div className={cn("flex w-full justify-center", className)}>
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