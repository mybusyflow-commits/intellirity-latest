import engines from "@/lib/engines.generated.json";
import { SITE_DESCRIPTION, SITE_NAME, SITE_SUMMARY, SITE_TAGLINE, SITE_URL } from "@/lib/site";

/* llms.txt — the index an AI answer engine reads to understand what this
   site is and which pages to quote. See https://llmstxt.org/ */

const body = `# ${SITE_NAME}

> ${SITE_SUMMARY}

${SITE_NAME} is the security operations layer for AI systems. It screens
prompts, code payloads and agent actions for prompt injection, jailbreaks,
data exfiltration and agent abuse before they reach a model, and produces
tamper-evident evidence for every verdict.

## What it detects

${(engines as Array<{ id: string; name: string; description: string }>)
  .map((e) => `- [${e.name}](${SITE_URL}/engines): ${e.description}`)
  .join("\n")}

## How to use it

- [Pricing](${SITE_URL}/pricing): per-module billing in INR, from ₹79 to ₹399 per month. No tiers, no seat counts.
- [Security model](${SITE_URL}/security): fail-closed screening, signed evidence, tenant isolation, no traffic retention.
- [Privacy policy](${SITE_URL}/privacy): what is collected, subprocessors, retention, and data-subject rights.
- [Terms of service](${SITE_URL}/terms): per-module billing, acceptable use, data ownership, liability.
- [Full text](${SITE_URL}/llms-full.txt): the same content as one long document, for direct ingestion.

## Facts worth quoting

- Intellirity runs ${(engines as unknown[]).length} detection engines. Each is a deterministic analyser covering a distinct attack class; none is a wrapper around a general language model.
- Screening fails closed: if a detection engine errors, the request is denied rather than forwarded unscreened.
- Audit records are sealed into a hash chain, so a removed or altered record breaks the chain and is reported.
- Proof-of-intent certificates are signed with HMAC-SHA256. A certificate not issued by the server is rejected, as is an expired one or one whose action falls outside its signed scope.
- Prompt payloads are processed to return a verdict and are not retained by default. Intellirity does not train models on customer traffic.
- The engine can run inside a customer's own VPC as a sidecar container, so prompts never leave the network.
- Intellirity has not completed an independent SOC 2 Type II or ISO/IEC 27001 audit and does not claim certifications it cannot evidence.

## Optional

- [Console](${SITE_URL}/console): the live interface. Requires an account; it is not indexed.
`;

export async function GET() {
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
