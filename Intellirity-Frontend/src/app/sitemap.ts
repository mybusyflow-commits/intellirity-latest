import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { PUBLIC_ROUTES } from "@/lib/routes";
import { BLOG_POSTS } from "@/lib/blog";

/* Only pages that are meant to be found are listed. The console is
   authenticated, so it is excluded here (and disallowed in robots.txt and
   noindex in its metadata).

   `lastModified` is deliberately absent. Emitting `new Date()` on every
   request tells crawlers that every page changed a second ago, which is
   both untrue and a signal search engines learn to ignore. A real build
   timestamp per page is the honest alternative; until the content pipeline
   provides one, omitting the field is more truthful than faking it. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = PUBLIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path === "/" ? "" : r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  // Articles carry a real publication date, so `lastModified` is honest here
  // rather than a build timestamp applied to every URL.
  const articles = BLOG_POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date),
    changeFrequency: "yearly" as const,
    priority: 0.6,
  }));

  return [...pages, ...articles];
}
