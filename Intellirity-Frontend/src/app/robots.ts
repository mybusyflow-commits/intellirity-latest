import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Crawl policy.

   The goal is reach. Only genuinely private, non-document surfaces are
   disallowed: the authenticated console, the API, and the auth utility
   pages. Everything a visitor can read without signing in is crawlable by
   every major search engine and by the answer engines that cite sources.

   The previous version blocked whole families of crawlers (CCBot,
   Bytespider, Amazonbot, meta-externalagent, cohere-ai, Diffbot, YouBot)
   with `Disallow: /`. Those agents power AI answers and discovery in
   products people actually use, so blocking them removed the site from
   those surfaces without protecting anything: the public pages are, by
   definition, public. Training-only crawlers are therefore allowed too;
   the private paths stay blocked for every agent.

   `Sitemap` is absolute. The non-standard `Host` directive is omitted: it
   is Yandex-specific and validators treat it as noise.
 */
export default function robots(): MetadataRoute.Robots {
  const disallow = [
    "/console",
    "/console/",
    "/backend/",
    "/api/",
    "/sign-in",
    "/sign-up",
    "/dashboard",
  ];

  return {
    rules: [
      {
        // Google, Bing, Yahoo, DuckDuckGo, Yandex, Apple and every other
        // general crawler.
        userAgent: "*",
        allow: "/",
        disallow,
      },
      {
        // AI answer engines: allowed on the public site so Intellirity can
        // be retrieved and cited accurately. They are listed explicitly
        // because some are governed by their own group when one exists.
        userAgent: [
          "Googlebot",
          "Googlebot-Image",
          "Bingbot",
          "Slurp",
          "DuckDuckBot",
          "YandexBot",
          "Applebot",
          "Applebot-Extended",
          "GPTBot",
          "OAI-SearchBot",
          "ChatGPT-User",
          "ClaudeBot",
          "Claude-SearchBot",
          "PerplexityBot",
          "Perplexity-User",
          "Amazonbot",
          "CCBot",
          "Bytespider",
          "meta-externalagent",
          "cohere-ai",
          "Diffbot",
          "YouBot",
        ],
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
