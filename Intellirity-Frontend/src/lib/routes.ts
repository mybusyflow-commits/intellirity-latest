/* Single source of truth for every route in the product.

   The sitemap, the robots policy, the console navigation, the command
   palette and the page metadata all read from here, so adding a page
   cannot silently leave it out of the index (or out of the nav). */

export interface RouteDef {
  /** Path relative to the console root. "" is the console overview. */
  path: string;
  /** Page title, used for <title> and nav labels. */
  title: string;
  /** One-line description of what the page does. */
  sub: string;
  /** Nav grouping. */
  group: "Operate" | "Defend" | "Govern";
  /** Key in the sidebar/command palette. */
  key: string;
}

export const CONSOLE_ROUTES: RouteDef[] = [
  { path: "", title: "Overview", sub: "Fleet posture, live scores and recent activity", group: "Operate", key: "overview" },
  { path: "/scanner", title: "Scanner", sub: "Run a multi-engine sweep against any target", group: "Operate", key: "scanner" },
  { path: "/verdicts", title: "Verdicts", sub: "Live stream of every judgement the engine made", group: "Operate", key: "verdicts" },
  { path: "/leakage", title: "Leakage guard", sub: "PII, secrets, and code redacted in flight", group: "Defend", key: "leakage" },
  { path: "/anomalies", title: "Anomalies", sub: "Workflow loops, runaway spend and destructive chains", group: "Defend", key: "anomalies" },
  { path: "/proof", title: "Proof of intent", sub: "Certificates binding a human to an action", group: "Govern", key: "proof" },
  { path: "/flow", title: "Data flow", sub: "Trace every destination your data reaches", group: "Defend", key: "flow" },
  { path: "/content", title: "Content guard", sub: "Moderation across seven scored categories", group: "Defend", key: "content" },
  { path: "/behavior", title: "Agent behavior", sub: "Session drift and MCP tool governance", group: "Defend", key: "behavior" },
  { path: "/intel", title: "Threat intel", sub: "Known threats and advanced adversarial probes", group: "Defend", key: "intel" },
  { path: "/wallet", title: "Wallet guard", sub: "Token and cost ceilings for agent spend", group: "Operate", key: "wallet" },
  { path: "/models", title: "Models & agents", sub: "Registered endpoints under guard", group: "Operate", key: "models" },
  { path: "/policies", title: "Policies", sub: "Guardrail packs, versioned and two-approver promoted", group: "Govern", key: "policies" },
  { path: "/escrow", title: "Agent escrow", sub: "Custody for autonomous value movement", group: "Govern", key: "escrow" },
  { path: "/audit", title: "Audit log", sub: "Tamper-evident, hash-chained history", group: "Govern", key: "audit" },
];

export const consoleHref = (path: string) => `/console${path}`;

/* Pages that belong in search results and in answer engines. */
export interface PublicRoute {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    title: "AI Security Platform for LLMs & Agents | Intellirity",
    description:
      "Intellirity is an AI security platform that screens prompts, code and agent actions for prompt injection, LLM jailbreaks, data exfiltration and agent abuse, with tamper-evident evidence for every verdict.",
    priority: 1.0,
    changeFrequency: "weekly",
  },
  {
    path: "/engines",
    title: "AI Security Detection Engines | Intellirity",
    description:
      "All sixteen Intellirity AI security detection engines: prompt injection, LLM jailbreaks, AI data loss prevention, agent abuse, MCP security, model supply chain and more.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/pricing",
    title: "AI Security Pricing | Intellirity",
    description:
      "AI security pricing by module: nine detection modules from ₹79 to ₹399 per month, with 20% off when you take all nine and a live configurable plan builder.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/glossary",
    title: "AI Security Glossary | Intellirity",
    description:
      "Definitions for prompt injection, LLM jailbreaks, LLM firewalls, AI guardrails, AI data loss prevention, agent security, MCP security, model supply chain, AI red teaming and AI audit trails.",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | Intellirity",
    description:
      "How Intellirity processes data: what the engine stores, what it never trains on, retention, and your rights.",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/terms",
    title: "Terms of Service | Intellirity",
    description:
      "The terms governing use of the Intellirity platform, SDKs and screening proxy, including acceptable use and liability.",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/security",
    title: "AI Security Model | Intellirity",
    description:
      "How the Intellirity AI security model works: fail-closed screening, tamper-evident audit evidence, tenant isolation, no traffic retention and coordinated disclosure.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
];

/* Never indexed: the console is behind authentication, sign-in pages are
   utility pages, and /dashboard is a redirect. */
export const NOINDEX_ROUTES = [
  "/console",
  "/dashboard",
  "/sign-in",
  "/sign-up",
];
