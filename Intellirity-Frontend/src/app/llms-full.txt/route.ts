import engines from "@/lib/engines.generated.json";
import { LEGAL_DOCS } from "@/lib/legal";
import { LEGAL_EMAIL, SECURITY_EMAIL, SITE_NAME, SITE_SUMMARY, SITE_URL } from "@/lib/site";

/* llms-full.txt — the whole site as one plain-text document, for direct
   ingestion by an answer engine. */

function docText(key: string) {
  const d = LEGAL_DOCS[key];
  if (!d) return "";
  const sections = d.sections
    .map((s) => `## ${s.heading}\n\n${s.body.join("\n\n")}`)
    .join("\n\n");
  return `# ${d.title}\n\n_${d.updated}_\n\n${d.summary}\n\n${sections}`;
}

const body = `# ${SITE_NAME}

${SITE_SUMMARY}

## Detection engines

${(engines as Array<{ id: string; name: string; description: string; tier: string }>)
  .map(
    (e) =>
      `### ${e.name}\n\nTier: ${e.tier}\n\nAPI key: \`${e.id}\`\n\n${e.description}`
  )
  .join("\n\n")}

## Security model

${docText("security")}

## Privacy policy

${docText("privacy")}

## Terms of service

${docText("terms")}

## Acceptable use

${docText("terms-use")}

## Cookie policy

${docText("cookies")}

## Pricing

Intellirity is billed per detection module, per month, in Indian rupees.
There are no tiers and no seat counts. Prices run from ₹79 to ₹399 per
module per month across nine purchasable modules, and are served live from
the billing API. All nine modules bought together receive a 20% bundle
discount. The full list with live prices is at ${SITE_URL}/pricing.

## AI security glossary

Definitions for the vocabulary used above, with the engine or control that
handles each one: ${SITE_URL}/glossary

- **Prompt injection** — instructions hidden in content the model reads as data. Direct (user prompt) or indirect (retrieved documents, tool output).
- **LLM jailbreak** — persuading a model to ignore its own safety policy; distinct from injection, which hijacks the task.
- **LLM firewall** — an inline control that inspects prompts and responses and returns a verdict for every call.
- **AI guardrails** — policy constraints on model input, output and agent actions, including prevention and approval.
- **AI data loss prevention (DLP)** — detecting and redacting PII, secrets, code and regulated data in both directions.
- **AI agent security** — governing tool calls, permissions, spend and goals for autonomous agents.
- **MCP security** — auditing Model Context Protocol servers and tools for poisoning, over-broad scopes and confused-deputy calls.
- **AI model supply chain security** — verifying model provenance, integrity and hashes before deployment.
- **AI red teaming** — adversarial testing with the prompts and tool calls an attacker would use.
- **Denial of wallet** — exhausting an AI budget with runaway loops or token abuse.
- **AI audit trail** — an ordered, hash-chained record of each decision and its evidence.
- **Proof of intent** — a signed statement that a human authorized a specific action within a scope.
- **AI escrow** — holding agent funds or permissions until the work is verified.
- **AI content moderation** — screening inputs and outputs across seven harm categories with a category and confidence.

## Contact

Security and general: ${SECURITY_EMAIL}
Legal and privacy: ${LEGAL_EMAIL}
`;

export async function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
