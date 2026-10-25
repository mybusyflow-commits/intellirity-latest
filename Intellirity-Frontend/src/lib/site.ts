/* Canonical site identity.
   Every canonical tag, the sitemap, the robots policy, the social cards
   and the structured data derive from these constants. Set
   NEXT_PUBLIC_SITE_URL to the live production origin (Vercel sets it
   automatically) — the fallback is the marketing domain. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://intellirity.com"
).replace(/\/$/, "");

export const SITE_NAME = "Intellirity";
export const SITE_SHORT_NAME = "Intellirity";
export const SITE_TAGLINE = "Security Operations for AI";
export const SITE_DESCRIPTION =
  "Intellirity is the security operations layer for AI systems. Detect prompt injection, jailbreaks, data exfiltration, and agent abuse in real time, with tamper-evident evidence for every verdict.";

/* Short, factual description used on social cards and for answer engines —
   it states what the product is, not how it feels. */
export const SITE_SUMMARY =
  "Intellirity screens prompts, code and agent actions for prompt injection, jailbreaks, data exfiltration and agent abuse before they reach a model, and records tamper-evident evidence for every verdict.";

export const SITE_KEYWORDS = [
  "AI security",
  "prompt injection protection",
  "LLM jailbreak detection",
  "AI guardrails",
  "data loss prevention",
  "AI audit trail",
  "agent security",
  "LLM firewall",
  "AI red team",
  "model security",
];

/* Support and legal addresses. These must be real inboxes — the privacy
   and terms pages link to them, and a dead address in a legal document is
   a compliance problem, not a cosmetic one. */
export const CONTACT_EMAIL = "security@intellirity.com";
export const PRIVACY_EMAIL = "privacy@intellirity.com";
export const LEGAL_EMAIL = "legal@intellirity.com";
export const SECURITY_EMAIL = "security@intellirity.com";
