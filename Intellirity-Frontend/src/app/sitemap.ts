import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

const CONSOLE_ROUTES = [
  "",
  "/scanner",
  "/verdicts",
  "/leakage",
  "/anomalies",
  "/proof",
  "/flow",
  "/content",
  "/behavior",
  "/intel",
  "/wallet",
  "/models",
  "/policies",
  "/escrow",
  "/audit",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...CONSOLE_ROUTES.map((r) => ({
      url: `${SITE_URL}/console${r}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: r === "" ? 0.9 : 0.7,
    })),
  ];
}
