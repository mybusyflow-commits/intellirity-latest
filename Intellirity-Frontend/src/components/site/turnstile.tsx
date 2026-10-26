"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
    };
  }
}

/* Cloudflare Turnstile widget. Renders nothing until
   NEXT_PUBLIC_TURNSTILE_SITE_KEY exists (keyless dev stays open,
   matching the backend).

   A widget that cannot issue a token used to fail silently: the form
   simply returned "Spam check failed". The error callback now surfaces the
   Turnstile error code, which is almost always a hostname missing from the
   widget's configuration. */
export function Turnstile({ onToken }: { onToken: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  const [error, setError] = useState("");
  cb.current = onToken;

  useEffect(() => {
    if (!siteKey || !ref.current || ref.current.dataset.done) return;
    const render = () => {
      if (window.turnstile && ref.current && !ref.current.dataset.done) {
        ref.current.dataset.done = "1";
        window.turnstile.render(ref.current, {
          sitekey: siteKey,
          callback: (token: string) => {
            setError("");
            cb.current(token);
          },
          "error-callback": (code: unknown) => {
            setError(String(code || "unknown"));
            cb.current("");
          },
          "expired-callback": () => cb.current(""),
          "timeout-callback": () => cb.current(""),
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

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={ref} />
      {error !== "" && (
        <p role="alert" className="max-w-xs text-center font-mono text-[10px] leading-relaxed text-[#a33]">
          Spam check unavailable ({error}). Add this hostname to the Turnstile
          site in Cloudflare.
        </p>
      )}
    </div>
  );
}
