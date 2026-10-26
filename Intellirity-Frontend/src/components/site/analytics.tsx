"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

/* Google Analytics 4 — consent gated.

   Analytics is a third party that sets cookies, so it does not load until
   the visitor accepts it. The choice is stored in localStorage; declining
   leaves the site fully functional. The cookie policy documents exactly
   this, and the two cannot drift because both describe this file.

   Page views are not sent from React. GA4's enhanced measurement
   ("page changes based on browser history events") already emits one
   page_view for the initial load and one for every App Router navigation.
   Sending a second event from a useEffect double-counted every route
   change, and a first-mount guard only traded that for a race with the
   gtag script. One source of truth: the tag itself. */
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
gtag('config', '${GA_ID}', { allow_google_signals: false });`}
      </Script>
    </>
  );
}
