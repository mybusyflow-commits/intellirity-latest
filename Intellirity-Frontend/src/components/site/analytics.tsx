"use client";

import { Suspense, useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/* Google Analytics 4 — consent gated.

   Analytics is a third party that sets cookies, so it does not load until
   the visitor accepts it. The choice is stored in localStorage; declining
   leaves the site fully functional. The cookie policy documents exactly
   this, and the two cannot drift because both describe this file. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CONSENT_KEY = "intellirity-analytics-consent";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export type AnalyticsConsent = "granted" | "denied" | "unset";

export function readAnalyticsConsent(): AnalyticsConsent {
  if (typeof window === "undefined") return "unset";
  try {
    const v = window.localStorage.getItem(CONSENT_KEY);
    return v === "granted" || v === "denied" ? v : "unset";
  } catch {
    return "unset";
  }
}

export function writeAnalyticsConsent(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(CONSENT_KEY, value);
  } catch {
    /* storage unavailable: the choice simply does not persist */
  }
  window.dispatchEvent(new CustomEvent("intellirity:analytics-consent"));
}

function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    // An event, not a second config — reconfiguring resets GA session
    // state on every navigation.
    window.gtag("event", "page_view", { page_path: pathname });
  }, [pathname]);
  return null;
}

export function Analytics() {
  const [consent, setConsent] = useState<AnalyticsConsent>("unset");

  useEffect(() => {
    setConsent(readAnalyticsConsent());
    const onChange = () => setConsent(readAnalyticsConsent());
    window.addEventListener("intellirity:analytics-consent", onChange);
    return () => window.removeEventListener("intellirity:analytics-consent", onChange);
  }, []);

  if (!GA_ID || consent !== "granted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true, allow_google_signals: false });`}
      </Script>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
