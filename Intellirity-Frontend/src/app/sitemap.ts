import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_ROUTES } from "@/lib/routes";

/* Only pages that are meant to be found are listed. The console is
   authenticated, so it is excluded here (and disallowed in robots.txt and
   noindex in its metadata). */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    lastModified: new Date(),
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
