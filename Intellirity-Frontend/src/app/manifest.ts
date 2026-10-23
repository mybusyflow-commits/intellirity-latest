import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SHORT_NAME, SITE_URL } from "@/lib/site";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Security Operations for AI`,
    short_name: SITE_SHORT_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0b0d",
    theme_color: "#0a0b0d",
    icons: [
      { src: "/favicon.png", sizes: "64x64", type: "image/png" },
      { src: "/favicon-full.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    categories: ["security", "productivity", "developer"],
  };
}
