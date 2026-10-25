import type { Metadata } from "next";
import { Preloader } from "@/components/fx/preloader";
import { FlowWave } from "@/components/fx/flow-wave";
import { Navbar } from "@/components/site/navbar";
import { Hero } from "@/components/site/hero";
import { Marquee } from "@/components/site/marquee";
import { ProofStrip, Integrate } from "@/components/site/proof-integrate";
import { ThreatPulse } from "@/components/site/threat-pulse";
import { Platform } from "@/components/site/platform";
import { KineticBreak } from "@/components/site/kinetic-break";
import { Scanner } from "@/components/site/scanner";
import { HowItWorks } from "@/components/site/how-it-works";
import { Metrics } from "@/components/site/metrics";
import { Pricing } from "@/components/site/pricing";
import { Faq, FinalCta, Footer } from "@/components/site/faq-cta-footer";
import { SITE_NAME, SITE_SUMMARY, SITE_TAGLINE, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: `${SITE_NAME} | ${SITE_TAGLINE}`,
  description: SITE_SUMMARY,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_SUMMARY,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} | ${SITE_TAGLINE}`,
    description: SITE_SUMMARY,
    images: ["/og-image.png"],
  },
};

export default function Home() {
  return (
    <>
      <Preloader />
      {/* Flow Wave — realtime WebGL field behind the whole landing page */}
      <div className="flowwave-wrap pointer-events-none fixed inset-0 z-0" aria-hidden>
        <FlowWave />
      </div>
      {/* legibility scrim above the field, below the content */}
      <div className="landing-scrim pointer-events-none fixed inset-0 z-0" aria-hidden />
      {/* faint fixed dot-grid — texture over the field */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div className="grid-texture absolute inset-0 opacity-40" />
      </div>
      <Navbar />
      <main className="relative">
        <Hero />
        <Marquee />
        <ProofStrip />
        <ThreatPulse />
        <Platform />
        <Integrate />
        <KineticBreak />
        <section
          id="scanner"
          className="relative z-10 mx-auto max-w-[1240px] px-6 py-24 md:py-32"
        >
          <div className="reveal mb-10 flex items-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
            <span className="text-steel">04</span>
            <span className="h-px w-8 bg-line-strong" />
            live scanner
          </div>
          <h2 className="reveal sr-only">Scan any target with the live engine</h2>
          <Scanner />
        </section>
        <HowItWorks />
        <Metrics />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
