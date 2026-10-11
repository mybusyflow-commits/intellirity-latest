import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { DarkEnforcer } from "@/components/fx/dark-enforcer";
import { AuthBridge } from "@/components/site/auth-bridge";

/* Clerk activates only once NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists.
   Until then the app renders exactly as before (keyless local dev). */
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
import {
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_NAME,
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
  alternates: {
    canonical: SITE_URL,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: TITLE_DEFAULT,
    description: "Detect, judge, and neutralize AI threats in real time.",
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
    description: "Detect, judge, and neutralize AI threats in real time.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
  verification: {
    // TODO: paste the Google Search Console verification token here
    // once the production domain is connected, e.g. google: "abc123…".
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
  width: "device-width",
  initialScale: 1,
};

/* Server-rendered structured data: Organization + product + FAQ. */
function JsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#org`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/logo.png`,
        description: SITE_DESCRIPTION,
      },
      {
        "@type": "SoftwareApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "SecurityApplication",
        operatingSystem: "Web",
        description: SITE_DESCRIPTION,
        offers: {
          "@type": "Offer",
          price: "99",
          priceCurrency: "INR",
          description: "Starter workspace, per month",
        },
      },
      {
        "@type": "WebSite",
        url: SITE_URL,
        name: SITE_NAME,
        publisher: { "@id": `${SITE_URL}#org` },
      },
    ],
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const bodyInner = (
    <>
      <DarkEnforcer />
      {children}
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
