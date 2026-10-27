/* Keyword architecture.
 *
 * One place for the vocabulary the product actually owns, grouped by
 * intent. Pages select the clusters that match what they are about, and the
 * sitemap, metadata and structured data read from the same source. No page
 * repeats another page's primary phrase, so the site does not compete with
 * itself in search results.
 */

export const KEYWORD_CLUSTERS = {
  platform: [
    "AI security",
    "AI security platform",
    "AI security operations",
    "LLM security",
    "AI threat detection",
    "security operations for AI",
  ],
  input: [
    "prompt injection protection",
    "prompt injection detection",
    "LLM jailbreak detection",
    "jailbreak prevention",
    "AI guardrails",
    "LLM firewall",
    "AI firewall",
  ],
  data: [
    "AI data loss prevention",
    "AI DLP",
    "PII redaction",
    "secret detection",
    "data exfiltration prevention",
    "AI data flow tracking",
  ],
  agents: [
    "AI agent security",
    "agent guardrails",
    "autonomous agent security",
    "MCP security",
    "tool governance",
    "AI action policy",
  ],
  models: [
    "AI model supply chain security",
    "model integrity",
    "model provenance",
    "AI red teaming",
    "LLM red team",
    "adversarial testing",
  ],
  evidence: [
    "AI audit trail",
    "tamper-evident audit log",
    "AI compliance evidence",
    "hash-chained ledger",
    "proof of intent",
    "AI escrow",
  ],
  operations: [
    "AI cost control",
    "denial of wallet",
    "token spend control",
    "AI content moderation",
    "responsible AI",
    "AI security monitoring",
  ],
} as const;

export type KeywordCluster = keyof typeof KEYWORD_CLUSTERS;

/** Every term the product legitimately covers, de-duplicated. */
export const ALL_KEYWORDS: string[] = Array.from(
  new Set(Object.values(KEYWORD_CLUSTERS).flatMap((cluster) => [...cluster]))
);

/**
 * Per-page selection. The first entry is the page's primary phrase and is
 * also used in its title, H1 and description.
 */
export const PAGE_KEYWORDS: Record<string, string[]> = {
  "/": [
    ...KEYWORD_CLUSTERS.platform,
    ...KEYWORD_CLUSTERS.input,
    "AI audit trail",
    "AI agent security",
  ],
  "/engines": [
    "AI security detection engines",
    "prompt injection detection",
    "LLM jailbreak detection",
    "AI data loss prevention",
    "AI agent security",
    "MCP security",
    "AI model supply chain security",
    "AI red teaming",
    "AI content moderation",
    "denial of wallet",
  ],
  "/pricing": [
    "AI security pricing",
    "LLM security pricing",
    "AI guardrails pricing",
    "AI security cost",
    "per-module AI security",
    "AI security plans",
  ],
  "/security": [
    "AI security model",
    "AI security architecture",
    "fail-closed AI security",
    "tamper-evident AI audit trail",
    "AI compliance evidence",
    "AI tenant isolation",
    "AI data retention",
  ],
  "/glossary": [
    "AI security glossary",
    "prompt injection definition",
    "LLM firewall",
    "AI guardrails",
    "AI data loss prevention",
    "MCP security",
    "AI red teaming",
    "proof of intent",
  ],
  "/about": [
    "AI security company",
    "AI security founder",
    "Intellirity founder",
    "AI cybersecurity startup",
    "AI security team",
    "Shreyansh Krishna",
  ],
  "/research": [
    "AI security research",
    "prompt injection research",
    "AI agent abuse research",
    "LLM red teaming",
    "responsible disclosure AI",
  ],
  "/careers": [
    "Intellirity careers",
    "AI security jobs",
    "LLM security engineer",
    "AI security researcher",
  ],
  "/contact": [
    "contact Intellirity",
    "AI security support",
    "AI security company contact",
    "billing support India",
  ],
  "/refund-policy": [
    "Intellirity refund policy",
    "AI security subscription refund",
    "cancellation policy",
  ],
  "/delivery": [
    "Intellirity delivery policy",
    "digital service delivery",
    "AI security activation",
  ],
  "/privacy": ["AI privacy", "AI data processing", "AI data retention"],
  "/terms": ["AI security terms", "acceptable use", "AI platform terms"],
};
