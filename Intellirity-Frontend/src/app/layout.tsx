import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { DarkEnforcer } from "@/components/fx/dark-enforcer";
import { Analytics } from "@/components/site/analytics";
import { AuthBridge } from "@/components/site/auth-bridge";
import { ConsentBanner } from "@/components/site/consent-banner";
import { FAQS, faqAnswerText } from "@/lib/faq";

/* Clerk activates only once NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists.
   Until then the app renders exactly as before (keyless local dev). */
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
  SITE_SUMMARY,
  SITE_TAGLINE,
  SITE_URL,
} from "@/lib/site";

/* Local system font stacks: no network dependency at build or runtime.
   Space Grotesk / Inter / JetBrains Mono fall back gracefully when installed,
   otherwise to metric-adjacent system faces. */

const TITLE_DEFAULT = `${SITE_NAME} | ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  applicationName: SITE_NAME,
  // No blanket `alternates.canonical` here: a root canonical is inherited
  // by every child that does not define its own, which made /sign-in and
  // /sign-up canonicalise to the homepage. Each page sets its own.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: TITLE_DEFAULT,
    description: SITE_SUMMARY,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME}: ${SITE_TAGLINE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: SITE_SUMMARY,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.png", type: "image/png", sizes: "64x64" },
      { url: "/favicon-full.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [{ url: "/apple-icon.png", type: "image/png", sizes: "180x180" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false, address: false, email: false },
  verification: {
    // Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION to the Google Search Console
    // token once the production domain is connected.
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    // Bing Webmaster Tools uses the msvalidate.01 meta tag. Bing also
    // powers Apple's default search results, so it is worth the token.
    other: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION }
      : {},
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

/* Server-rendered structured data: Organization, product, website and the
   four-step deployment procedure. The FAQPage lives with the FAQ it
   describes, so the schema always sits next to the visible answers. */
function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/logo.png`,
          width: 480,
          height: 172,
        },
        description: SITE_DESCRIPTION,
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: "security@intellirity.ai",
            availableLanguage: "en",
          },
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}#app`,
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "SecurityApplication",
        applicationSubCategory: "AI/LLM security",
        operatingSystem: "Web",
        description: SITE_SUMMARY,
        featureList: [
          "Prompt injection and jailbreak detection",
          "Data loss prevention for prompts and code",
          "Agent action policy enforcement",
          "MCP server and tool governance",
          "Model supply chain verification",
          "Tamper-evident audit ledger",
          "Proof-of-intent certificates",
          "Autonomous escrow",
          "Screening reverse proxy",
        ],
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: "79",
          highPrice: "399",
          offerCount: "9",
          description:
            "Per-module pricing, billed monthly. Prices are served live by the billing API.",
        },
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}#org` },
      },
      {
        "@type": "HowTo",
        "@id": `${SITE_URL}#howto`,
        name: "How to deploy Intellirity in four moves",
        description:
          "Connect the gateway, compose policy, judge every call, and answer with evidence.",
        step: [
          {
            "@type": "HowToStep",
            position: 1,
            name: "Connect the mesh",
            text: "Point your OpenAI-compatible base URL at the Intellirity gateway and set the API key. Two environment variables, no code changes.",
          },
          {
            "@type": "HowToStep",
            position: 2,
            name: "Compose policy",
            text: "Choose the detection engines you need and the policy pack that matches your workload, from payments-strict to code-assist.",
          },
          {
            "@type": "HowToStep",
            position: 3,
            name: "Judge every call",
            text: "Every prompt, code payload and agent action is screened before it reaches a model. Blocked calls are logged with the evidence that produced the verdict.",
          },
          {
            "@type": "HowToStep",
            position: 4,
            name: "Answer with evidence",
            text: "Each verdict is sealed into a hash-chained ledger, so the decision can be reconstructed and verified after the fact.",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}#faq`,
        mainEntity: FAQS.map((f, i) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: faqAnswerText(f.a),
            url: `${SITE_URL}/#faq-${i + 1}`,
          },
        })),
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        // Escaping "<" prevents a "</script>" inside the data from
        // breaking out of the script tag.
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const bodyInner = (
    <>
      <DarkEnforcer />
      <Analytics />
      {children}
      <ConsentBanner />
      <JsonLd />
    </>
  );

  return (
    <html lang="en" className="dark">
      <body className="bg-bg font-sans text-ink antialiased">
        {CLERK_KEY ? (
          <ClerkProvider
            signInUrl="/sign-in"
            signUpUrl="/sign-up"
            afterSignOutUrl="/"
          >
            <AuthBridge />
            {bodyInner}
          </ClerkProvider>
        ) : (
          bodyInner
        )}
      </body>
    </html>
  );
}
