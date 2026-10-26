import { ALL_KEYWORDS } from "@/lib/keywords";

/* Canonical site identity.
   Every canonical tag, the sitemap, the robots policy, the social cards
   and the structured data derive from these constants.

   Host choice is deliberate: on Vercel, the canonical host must be the
   host the deployment actually serves. Asking for apex while Vercel's
   primary domain is www produces canonicals that redirect, and Search
   Console reports "Page with redirect" for every URL in the sitemap.
   VERCEL_PROJECT_PRODUCTION_URL is the project's primary domain, so the
   two cannot disagree. NEXT_PUBLIC_SITE_URL remains the local/self-host
   override, and the marketing domain is the last fallback. */
const PRODUCTION_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const CONFIGURED_SITE = process.env.NEXT_PUBLIC_SITE_URL;
export const SITE_URL = (
  (process.env.VERCEL_ENV === "production" && PRODUCTION_HOST
    ? `https://${PRODUCTION_HOST}`
    : CONFIGURED_SITE) || "https://intellirity.com"
).replace(/\/$/, "");

export const SITE_NAME = "Intellirity";
export const SITE_SHORT_NAME = "Intellirity";
export const SITE_TAGLINE = "Security Operations for AI";
export const SITE_DESCRIPTION =
  "Intellirity is an AI security platform that screens prompts, code and agent actions for prompt injection, jailbreaks, data exfiltration and agent abuse, with tamper-evident evidence for every verdict.";

/* Short, factual description used on social cards and for answer engines —
   it states what the product is, not how it feels. */
export const SITE_SUMMARY =
  "Intellirity is an AI security platform: it screens prompts, code and agent actions for prompt injection, jailbreaks, data exfiltration and agent abuse before they reach a model, and records tamper-evident evidence for every verdict.";

/* The full vocabulary the product covers, used for the global keywords
   meta tag and the SoftwareApplication schema. Pages narrow this with
   PAGE_KEYWORDS in lib/keywords.ts. */
export const SITE_KEYWORDS: string[] = ALL_KEYWORDS;

/* Support and legal addresses. These must be real inboxes — the privacy
   and terms pages link to them, and a dead address in a legal document is
   a compliance problem, not a cosmetic one. */
export const CONTACT_EMAIL = "security@intellirity.com";
export const PRIVACY_EMAIL = "privacy@intellirity.com";
export const LEGAL_EMAIL = "legal@intellirity.com";
export const SECURITY_EMAIL = "security@intellirity.com";
