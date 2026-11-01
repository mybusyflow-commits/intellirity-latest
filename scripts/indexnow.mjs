#!/usr/bin/env node
/* Submit every public URL to IndexNow after a deploy.
 *
 * IndexNow is the shared instant-indexing endpoint used by Bing, Yandex,
 * Seznam and Naver. Ownership is proven by a key file served from the site
 * root; the key below must match public/<key>.txt exactly.
 *
 *   node scripts/indexnow.mjs
 *   INDEXNOW_HOST=www.intellirity.com node scripts/indexnow.mjs
 */
const HOST = (process.env.INDEXNOW_HOST || "www.intellirity.com").replace(/^https?:\/\//, "").replace(/\/$/, "");
const KEY = process.env.INDEXNOW_KEY || "4c1f9d7a2b8e4f60a3c5d9e7b1f2a6c8";
const ORIGIN = `https://${HOST}`;
const KEY_LOCATION = `${ORIGIN}/${KEY}.txt`;
const ENDPOINT = "https://api.indexnow.org/indexnow";

async function main() {
  const keyCheck = await fetch(KEY_LOCATION, { cache: "no-store" });
  const served = (await keyCheck.text()).trim();
  if (!keyCheck.ok || served !== KEY) {
    throw new Error(`Key file ${KEY_LOCATION} is not serving the key (HTTP ${keyCheck.status}).`);
  }

  const sitemap = await fetch(`${ORIGIN}/sitemap.xml`, { cache: "no-store" });
  if (!sitemap.ok) throw new Error(`sitemap.xml returned HTTP ${sitemap.status}`);
  const xml = await sitemap.text();
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (urls.length === 0) throw new Error("sitemap.xml has no <loc> entries.");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
  });

  // 200 = accepted, 202 = accepted and key pending validation.
  console.log(`IndexNow: HTTP ${res.status} for ${urls.length} URL(s) on ${HOST}`);
  if (!res.ok && res.status !== 202) {
    throw new Error((await res.text()).slice(0, 300) || `IndexNow rejected the submission.`);
  }
}

main().catch((err) => {
  console.error(`IndexNow failed: ${err.message}`);
  process.exit(1);
});
