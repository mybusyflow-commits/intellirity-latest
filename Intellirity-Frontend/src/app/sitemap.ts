import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_ROUTES } from "@/lib/routes";

/* Only pages that are meant to be found are listed. The console is
   authenticated, so it is excluded here (and disallowed in robots.txt and
   noindex in its metadata).

   `lastModified` is deliberately absent. Emitting `new Date()` on every
   request tells crawlers that every page changed a second ago, which is
   both untrue and a signal search engines learn to ignore. A real build
   timestamp per page is the honest alternative; until the content pipeline
   provides one, omitting the field is more truthful than faking it. */
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));
}
