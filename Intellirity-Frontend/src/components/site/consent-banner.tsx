"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  readAnalyticsConsent,
  writeAnalyticsConsent,
  type AnalyticsConsent,
} from "@/components/site/analytics";

/* Consent control for analytics.

   The site loads one third-party analytics script. It is off until the
   visitor accepts it, and the choice is reversible from the footer. The
   cookie policy states exactly this behaviour. */
export function ConsentBanner() {
  const [consent, setConsent] = useState<AnalyticsConsent>("unset");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setConsent(readAnalyticsConsent());
    setReady(true);
  }, []);

  if (!ready || consent !== "unset") return null;

  return (
    <div
      role="region"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 right-4 z-[80] mx-auto max-w-[560px] rounded-lg border border-line bg-raise/95 p-4 shadow-2xl backdrop-blur-md sm:left-auto sm:right-6"
    >
      <p className="text-[13px] leading-relaxed text-dim">
        We use Google Analytics to count page views. It sets cookies and is
        loaded only if you accept it — declining changes nothing about how
        the site works. See the{" "}
        <Link href="/privacy" className="text-ink underline decoration-steel/60 underline-offset-2 hover:decoration-ink">
          privacy policy
        </Link>
        .
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => {
            writeAnalyticsConsent("granted");
            setConsent("granted");
          }}
          className="inline-flex h-9 items-center rounded bg-ink px-4 text-[12.5px] font-medium text-bg transition-colors hover:bg-white"
        >
          Accept analytics
        </button>
        <button
          onClick={() => {
            writeAnalyticsConsent("denied");
            setConsent("denied");
          }}
          className="inline-flex h-9 items-center rounded border border-line-strong px-4 text-[12.5px] font-medium transition-colors hover:border-ink/40"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
