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
the billing API. The full list with live prices is at ${SITE_URL}/pricing.

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
