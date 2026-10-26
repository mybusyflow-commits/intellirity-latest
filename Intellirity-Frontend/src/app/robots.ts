import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Crawl policy.

   Every public page is crawlable. Only the API and its proxy prefix are
   disallowed: those are JSON endpoints, not documents, and they already
   send `X-Robots-Tag: noindex`. The console, sign-in and sign-up pages are
   deliberately not disallowed either — they carry `noindex` metadata and
   the console requires a session, so they cannot enter an index, while a
   broad Disallow on page-looking paths only produces "blocked by
   robots.txt" noise in Search Console.

   No crawler is named and no agent is blocked: search engines, AI answer
   engines and training crawlers may all read the public site. The previous
   `Host:` directive was non-standard and has been removed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/backend/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
