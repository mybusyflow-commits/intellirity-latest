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
import { Metrics } from "@/components/site/metrics";
import { Pricing } from "@/components/site/pricing";
import { Faq, FinalCta, Footer } from "@/components/site/faq-cta-footer";
import { PAGE_KEYWORDS } from "@/lib/keywords";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const HOME_TITLE = "AI Security Platform for LLMs & Agents";
const HOME_DESCRIPTION =
  "Intellirity is an AI security platform that screens prompts, code and agent actions for prompt injection, jailbreaks, data exfiltration and agent abuse, and records tamper-evident evidence for every verdict.";

export const metadata: Metadata = {
  title: { absolute: `${HOME_TITLE} | ${SITE_NAME}` },
  description: HOME_DESCRIPTION,
  keywords: PAGE_KEYWORDS["/"],
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: `${HOME_TITLE} · ${SITE_NAME}`,
    description: HOME_DESCRIPTION,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${HOME_TITLE} · ${SITE_NAME}`,
    description: HOME_DESCRIPTION,
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
        <Metrics />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
