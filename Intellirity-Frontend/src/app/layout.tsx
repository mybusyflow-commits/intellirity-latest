import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DarkEnforcer } from "@/components/fx/dark-enforcer";

/* Local system font stacks: no network dependency at build or runtime.
   Space Grotesk / Inter / JetBrains Mono fall back gracefully when installed,
   otherwise to metric-adjacent system faces. */

export const metadata: Metadata = {
  metadataBase: new URL("https://intellirity.example.com"),
  title: {
    default: "Intellirity | Security Operations for AI",
    template: "%s · Intellirity",
  },
    description:
      "The security operations layer for AI systems. Detect prompt injection, jailbreaks, and model exfiltration in real time, with evidence for every verdict.",
  openGraph: {
    title: "Intellirity | Security Operations for AI",
    description:
      "Detect, judge, and neutralize AI threats in real time.",
    type: "website",
  },
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
    apple: [{ url: "/favicon.png", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-bg font-sans text-ink antialiased">
        <DarkEnforcer />
        {children}
      </body>
    </html>
  );
}
