"use client";

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
import { RevealProvider } from "@/components/site/reveal-provider";

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
      <RevealProvider />
      <Navbar />
      <main className="relative">
        <Hero />
        <Marquee />
        <ProofStrip />
        <ThreatPulse />
        <Platform />
        <Integrate />
        <KineticBreak />
        <Scanner />
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
