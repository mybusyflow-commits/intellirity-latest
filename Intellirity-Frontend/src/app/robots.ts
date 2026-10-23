import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/* Crawl policy.

   The console is behind authentication: it is not in the sitemap, it is
   disallowed here, and every console page also sends `noindex` in its
   metadata. Blocking it three ways means one broken mechanism cannot put
   login-walled pages into an index.

   AI answer engines get their own rules. Search-oriented crawlers
   (GPTBot, OAI-SearchBot, ClaudeBot, PerplexityBot, Google-Extended)
   may read the public pages so Intellirity can be cited accurately;
   training-oriented crawlers (CCBot, Google-Extended's training use,
   Bytespider, meta-externalagent) are disallowed so the site's content is
   not harvested for model training. */
export default function robots(): MetadataRoute.Robots {
  const disallow = ["/console", "/backend/", "/api/", "/sign-in", "/sign-up", "/dashboard"];

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
      // Answer engines: allowed on the public site.
      {
        userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "PerplexityBot", "Perplexity-User", "Applebot-Extended", "Google-Extended"],
        allow: "/",
        disallow,
      },
      // Training crawlers: not allowed anywhere.
      {
        userAgent: ["CCBot", "Bytespider", "meta-externalagent", "Amazonbot", "cohere-ai", "Diffbot", "YouBot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
