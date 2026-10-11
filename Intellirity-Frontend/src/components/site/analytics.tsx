"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

/* Google Analytics 4. Renders nothing until NEXT_PUBLIC_GA_ID exists
   (paste the G-XXXXXXXXXX measurement ID to activate + sync). Pageviews
   fire on every App Router navigation once active. */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

function PageviewTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (!GA_ID || !window.gtag) return;
    window.gtag("config", GA_ID, { page_path: pathname });
  }, [pathname]);
  return null;
}

export function Analytics() {
  if (!GA_ID) return null;
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
gtag('config', '${GA_ID}');`}
      </Script>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
    </>
  );
}
