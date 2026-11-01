/* Search metadata limits.
 *
 * Bing's SEO/GEO audit flags a meta description outside roughly 120-160
 * characters. Article blurbs are written for humans and can be longer than
 * that, so the metadata copy is clamped at a word boundary while the page
 * itself keeps the full text.
 */
export function metaDescription(text: string, max = 158): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > 80 ? cut.slice(0, at) : cut).replace(/[\s.,;:—-]+$/, "")}…`;
}
