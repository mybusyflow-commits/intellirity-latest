/* The FAQ, in one place.

   The visible accordion and the FAQPage schema are generated from the same
   array, so the answers a person reads and the answers an answer engine
   quotes can never disagree. It lives outside the component so the root
   layout (a server component) can also emit the schema. */

export type AnswerSeg = { t: string; href?: string };

export const FAQS: Array<{ q: string; a: AnswerSeg[] }> = [
  {
    q: "Will Intellirity slow down our AI?",
    a: [
      { t: "No. Verdicts compute inline with async enforcement, so users never wait on security. The live round-trip is measured on every scan — open the " },
      { t: "dashboard", href: "/console" },
      { t: " and watch the mesh-health readout in the sidebar." },
    ],
  },
  {
    q: "Which models and frameworks are supported?",
    a: [
      { t: "Anything that speaks text: OpenAI, Anthropic, Google, Mistral, Llama, plus LangChain, Bedrock, Vertex, and raw HTTP. Register each endpoint under " },
      { t: "Models & agents", href: "/console/models" },
      { t: " and scan it against the live engine." },
    ],
  },
  {
    q: "Can we attack it ourselves before buying?",
    a: [
      { t: "Please do. Paste a jailbreak into the " },
      { t: "live scanner", href: "/console/scanner" },
      { t: " and watch the verdict stream, or run a sweep across all sixteen detection engines — see the " },
      { t: "full engine list", href: "/engines" },
      { t: "." },
    ],
  },
  {
    q: "Where does our data live?",
    a: [
      { t: "With you. Verdict metadata is yours and we never train on traffic. Every decision lands in the tamper-evident " },
      { t: "evidence vault", href: "/console/audit" },
      { t: ", verifiable any time. A sovereign deployment runs the whole engine inside your own VPC." },
    ],
  },
  {
    q: "What happens when the AI tries something risky?",
    a: [
      { t: "Dangerous actions are held in " },
      { t: "agent escrow", href: "/console/escrow" },
      { t: " until a human approves them, and every approval carries a signed " },
      { t: "proof of intent", href: "/console/proof" },
      { t: "." },
    ],
  },
  {
    q: "How is this different from a WAF?",
    a: [
      { t: "WAFs understand HTTP. Intellirity understands intent: semantic injection, multi-turn jailbreak chains, agent abuse, and exfiltration. See each control mapped to its live tab on the " },
      { t: "platform", href: "#platform" },
      { t: " section." },
    ],
  },
  {
    q: "How much does it cost?",
    a: [
      { t: "Intellirity is billed per detection module, per month: nine modules from ₹79 to ₹399. There are no tiers and no seat counts — you toggle the coverage you need and pay the sum. Compare every module in " },
      { t: "pricing", href: "/pricing" },
      { t: "." },
    ],
  },
  {
    q: "Are you SOC 2 or ISO 27001 certified?",
    a: [
      { t: "Not yet. We have not completed an independent SOC 2 Type II or ISO/IEC 27001 audit, and we do not publish badges we cannot evidence. What the product does enforce is written down in the " },
      { t: "security model", href: "/security" },
      { t: "." },
    ],
  },
];

/* The flat text of an answer, used by the schema. */
export const faqAnswerText = (a: AnswerSeg[]) => a.map((s) => s.t).join("");
