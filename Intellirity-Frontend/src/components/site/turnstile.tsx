"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    };
  }
}

/* Cloudflare Turnstile widget. Renders nothing until
   NEXT_PUBLIC_TURNSTILE_SITE_KEY exists (keyless dev stays open,
   matching the backend). */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey || !ref.current || ref.current.dataset.done) return;
    const render = () => {
      if (window.turnstile && ref.current && !ref.current.dataset.done) {
        ref.current.dataset.done = "1";
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => cb.current(token),
        });
      }
    };
    if (window.turnstile) {
      render();
    } else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = render;
      document.head.appendChild(s);
    }
  }, [siteKey]);

  if (!siteKey) return null;
  return <div ref={ref} className="flex justify-center" />;
}
