/* Single source of truth for every route in the product.

   The sitemap, the robots policy, the console navigation and the command
   palette all read from here, so adding a page cannot silently leave it
   out of the index (or out of the nav). */

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
  /** Billing product required to open this page, when it is paid. */
  product?: string;
}

export const CONSOLE_ROUTES: RouteDef[] = [
  { path: "", title: "Overview", sub: "Fleet posture, live scores and recent activity", group: "Operate", key: "overview" },
  { path: "/scanner", title: "Scanner", sub: "Run a multi-engine sweep against any target", group: "Operate", key: "scanner" },
  { path: "/verdicts", title: "Verdicts", sub: "Live stream of every judgement the engine made", group: "Operate", key: "verdicts" },
  { path: "/wallet", title: "Wallet guard", sub: "Token and cost ceilings for agent spend", group: "Operate", key: "wallet", product: "wallet-guard" },
  { path: "/models", title: "Models & agents", sub: "Registered endpoints under guard", group: "Operate", key: "models", product: "agent-guard" },
  { path: "/leakage", title: "Leakage guard", sub: "PII, secrets, and code redacted in flight", group: "Defend", key: "leakage", product: "leakage-guard" },
  { path: "/anomalies", title: "Anomalies", sub: "Workflow loops, runaway spend and destructive chains", group: "Defend", key: "anomalies", product: "agent-guard" },
  { path: "/flow", title: "Data flow", sub: "Trace every destination your data reaches", group: "Defend", key: "flow", product: "leakage-guard" },
  { path: "/content", title: "Content guard", sub: "Moderation across seven scored categories", group: "Defend", key: "content", product: "content-guard" },
  { path: "/behavior", title: "Agent behavior", sub: "Session drift and MCP tool governance", group: "Defend", key: "behavior", product: "agent-guard" },
  { path: "/intel", title: "Threat intel", sub: "Known threats and advanced adversarial probes", group: "Defend", key: "intel" },
  { path: "/proof", title: "Proof of intent", sub: "Certificates binding a human to an action", group: "Govern", key: "proof", product: "vpi" },
  { path: "/policies", title: "Policies", sub: "Guardrail packs, versioned and two-approver promoted", group: "Govern", key: "policies", product: "agent-guard" },
  { path: "/escrow", title: "Agent escrow", sub: "Custody for autonomous value movement", group: "Govern", key: "escrow", product: "escrow" },
  { path: "/audit", title: "Audit log", sub: "Tamper-evident, hash-chained history", group: "Govern", key: "audit", product: "ledger" },
];

export const consoleHref = (path: string) => `/console${path}`;

/* Pages that belong in search results and in answer engines.
   The page's own `metadata` in app/<route>/page.tsx owns its title and
   description; duplicating them here only created a second copy that could
   drift out of sync. This list owns the facts the sitemap needs. */
export interface PublicRoute {
  path: string;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: "/",
    priority: 1.0,
    changeFrequency: "weekly",
  },
  {
    path: "/engines",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/pricing",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/glossary",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/about",
    priority: 0.8,
    changeFrequency: "monthly",
  },
  {
    path: "/blog",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/research",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/careers",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    priority: 0.6,
    changeFrequency: "yearly",
  },
  {
    path: "/refund-policy",
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/delivery",
    priority: 0.4,
    changeFrequency: "yearly",
  },
  {
    path: "/privacy",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/terms",
    priority: 0.5,
    changeFrequency: "yearly",
  },
  {
    path: "/security",
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
