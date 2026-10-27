import { SITE_URL } from "@/lib/site";

/* robots.txt as a dynamic, no-store response.
 *
 * Search Console was still reading an edge-cached copy of the old policy,
 * which is why it reported "blocked by robots.txt" long after the file had
 * changed. This route is force-dynamic and sends no-store so every crawler
 * revalidation gets the current policy.
 *
 * The policy itself is deliberately permissive: everything is allowed. The
 * API and console already send X-Robots-Tag/noindex and the console requires
 * auth, so a Disallow line there only created false "blocked" reports.
 */
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function GET() {
  const body = `User-Agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store, max-age=0, must-revalidate",
    },
  });
}
