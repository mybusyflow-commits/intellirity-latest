/* Policy and legal content, in one place.

   Every claim here is checkable against the product. Where a control
   exists, the text says exactly what it does; where a control does not
   exist yet (independent certification, for example), the text says that
   instead of implying otherwise. These documents are rendered as real
   pages (/privacy, /terms, /security) and reused by the footer modals, so
   the crawlable version and the modal version can never disagree. */
import { CONTACT_EMAIL, LEGAL_EMAIL, PRIVACY_EMAIL, SECURITY_EMAIL } from "@/lib/site";

export interface LegalSection {
  heading: string;
  body: string[];
}

export interface LegalDoc {
  slug: string;
  title: string;
  updated: string;
  summary: string;
  sections: LegalSection[];
}

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    slug: "/privacy",
    title: "Privacy Policy",
    updated: "Effective 1 January 2026",
    summary:
      "What Intellirity collects, what it never does with it, and how to exercise your rights.",
    sections: [
      {
        heading: "What we collect",
        body: [
          "Account data: your name, work email, and — if you use organizations — your organization membership, role, and the models, policy packs and escrow holds your organization owns.",
          "Product telemetry: which detection engine ran, its verdict, its risk score, the latency of the check, and any error. These are the fields a verdict needs in order to be explainable.",
          "Scan payloads: prompts, code and agent actions you submit are processed to produce a verdict. They are not retained after the verdict is returned unless your plan explicitly configures an audit retention window.",
        ],
      },
      {
        heading: "What we never do",
        body: [
          "We do not train models on your traffic. Your scan payloads are not used to improve any model, ours or a third party's.",
          "We do not sell your data, and we do not share it with third parties except the subprocessors listed below, each bound by a data-processing agreement.",
          "We do not run background scans of your systems without an explicit instruction from you.",
        ],
      },
      {
        heading: "Subprocessors",
        body: [
          "Neon (managed PostgreSQL) — verdict and account storage. Your data is encrypted in transit and at rest.",
          "Cloudflare (Turnstile) — spam protection on the public contact form. Turnstile sees the form submission and the request IP, nothing from your scans.",
          "Vercel (application hosting) — serves the console and the API.",
          "Clerk (identity) — sign-in, sessions and organization membership. Clerk processes account identity data under its own privacy terms.",
          "Your chosen model gateway (for example OpenCode Zen) — only when you configure the reasoning endpoint or the reverse proxy. Prompts you send through the proxy are sent to that gateway by design.",
        ],
      },
      {
        heading: "The demo feed",
        body: [
          "An empty workspace shows synthetic activity so the console is not blank. Those rows are marked as demo traffic by the API and are excluded from your security score and your detection counts. Only findings produced from your own scans are counted as detections.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You can access, correct, export and delete your data at any time, or ask us to, by writing to " + PRIVACY_EMAIL + ". If you are in the EU/EEA, you have the rights of access, rectification, erasure, restriction, portability and objection, and you may lodge a complaint with your supervisory authority.",
        ],
      },
      {
        heading: "Retention",
        body: [
          "Account data is retained while your account is active and for 30 days after closure. Verdict metadata and audit records follow the retention window configured for your workspace. Backups are retained for 35 days and then deleted.",
        ],
      },
    ],
  },

  terms: {
    slug: "/terms",
    title: "Terms of Service",
    updated: "Effective 1 January 2026",
    summary:
      "The terms governing use of the Intellirity platform, SDKs and screening proxy.",
    sections: [
      {
        heading: "The service",
        body: [
          "Intellirity provides AI security enforcement as a subscription service. Billing is per module, per month. You choose the modules your workspace runs; the price is shown live in the pricing builder before you check out. Paid plans are cancelable at any time, and annual plans are refunded pro rata.",
          "The free tier includes a working engine so you can evaluate the product before paying. It is not a time-limited trial of a different product.",
        ],
      },
      {
        heading: "Acceptable use",
        body: [
          "Unlimited scans means unlimited good-faith security testing of systems you own or operate.",
          "You may not scan third-party systems without written authorization, resell scan capacity, extract or reproduce the detection rule bundle, or use verdict data to train a competing detection product.",
          "You may not attempt to disrupt the platform itself. Rate limits and fair-use controls apply and are enforced automatically.",
        ],
      },
      {
        heading: "Your data",
        body: [
          "You keep ownership of everything you submit. You grant us only the narrow licence needed to process it and return a verdict. See the Privacy Policy for what we collect and how long we keep it.",
        ],
      },
      {
        heading: "Availability and changes",
        body: [
          "We aim for high availability and publish live engine status in the console. Engine rule updates ship continuously; a rule change can alter a verdict for the same input, and each verdict records which engine version produced it so past decisions remain explainable.",
          "We may add, change or withdraw modules. If you have subscribed to a module we withdraw, you are not charged for it after the withdrawal takes effect.",
        ],
      },
      {
        heading: "Liability",
        body: [
          "Intellirity reduces risk; it does not eliminate it, and it is not a substitute for your own security review. To the extent permitted by law, our aggregate liability is limited to the fees you paid in the twelve months before the claim.",
          "Questions about these terms: " + LEGAL_EMAIL + ".",
        ],
      },
    ],
  },

  security: {
    slug: "/security",
    title: "AI Security Model",
    updated: "Effective 1 January 2026",
    summary:
      "How the Intellirity AI security model works: fail-closed screening, tamper-evident audit evidence, tenant isolation, no traffic retention, and coordinated vulnerability disclosure.",
    sections: [
      {
        heading: "Screening fails closed",
        body: [
          "If a detection engine errors, the screening proxy denies the request rather than forwarding it. A crash must never become a bypass.",
          "An invalid API key is rejected with 401 even when the deployment is in open mode, and a session token presented to a deployment that cannot validate it returns 503 instead of silently granting anonymous access.",
        ],
      },
      {
        heading: "Evidence is signed and chained",
        body: [
          "Every ledger record is sealed into a Merkle-style hash chain: each record commits to the one before it, so a removed or altered record breaks the chain and verify reports it.",
          "Proof-of-intent certificates are signed with HMAC-SHA256 using a server-side key. A certificate that was not issued by this server is rejected, as is one that has expired or whose proposed action falls outside its signed scope.",
        ],
      },
      {
        heading: "Tenant isolation",
        body: [
          "Ownership is scoped to a tenant: a member of a Clerk organization reads and writes that organization's billing, model endpoints, policy packs and escrow holds. Without an organization, a user owns a private tenant. Machine API keys are their own tenant and are never written to the user table.",
          "Engine responses are served with `Cache-Control: private, no-store` and `Vary: Authorization`, so a shared cache can never replay one tenant's data to another.",
        ],
      },
      {
        heading: "Input handling",
        body: [
          "Prompt payloads are processed to produce a verdict and are not retained by default.",
          "Code scanning enforces a size cap and refuses to fetch private, loopback, link-local or reserved addresses, so a scan target cannot be used to reach internal services.",
          "The console and public API are served with a Content-Security-Policy, HSTS, strict referrer policy and denied framing.",
        ],
      },
      {
        heading: "Deployment options",
        body: [
          "Managed: the console and API run as a hosted deployment with Postgres for durable storage.",
          "Sovereign: the engine ships as a sidecar container you run inside your own VPC, so prompts never leave your network.",
        ],
      },
      {
        heading: "Reporting a vulnerability",
        body: [
          "If you find a vulnerability in Intellirity, report it to " + SECURITY_EMAIL + ". We acknowledge within 24 hours, ship a fix or mitigation within 30 days, and credit researchers publicly unless you prefer anonymity. Good-faith research is authorized and will not be pursued legally.",
          "Intellirity has not completed an independent SOC 2 Type II or ISO/IEC 27001 audit. We do not claim certifications we cannot show you. If those matter to your procurement process, ask us for the current control documentation.",
        ],
      },
    ],
  },

  "terms-use": {
    slug: "/terms",
    title: "Acceptable Use",
    updated: "Effective 1 January 2026",
    summary: "What you may and may not do with the Intellirity platform.",
    sections: [
      {
        heading: "Allowed",
        body: [
          "Testing your own models, agents and applications. Red-teaming client systems with written authorization. Academic research with coordinated disclosure.",
        ],
      },
      {
        heading: "Prohibited",
        body: [
          "Attacking systems you do not own or operate. Exfiltrating or reproducing the detection rule bundle. Using verdict data to train competing detection models. Any attempt to disrupt the platform itself.",
        ],
      },
    ],
  },

  cookies: {
    slug: "/privacy",
    title: "Cookie Policy",
    updated: "Effective 1 January 2026",
    summary: "The cookies and local storage this site sets, and how to control them.",
    sections: [
      {
        heading: "Strictly necessary",
        body: [
          "The console sets one session cookie, required to keep you signed in. It is strictly necessary and is set without consent.",
          "The marketing site stores your theme preference in local storage. Blocking storage does not stop the site working.",
        ],
      },
      {
        heading: "Analytics",
        body: [
          "If you accept analytics, we load Google Analytics 4 to count page views. It sets the `_ga` and `_ga_<container-id>` cookies and sends the page path, referrer and a truncated IP address to Google, which is a subprocessor for this purpose.",
          "Analytics is off until you accept it, and it is never loaded on the console. You can change your choice at any time from the cookie control in the footer.",
        ],
      },
      {
        heading: "Control",
        body: [
          "Declining analytics leaves the whole site fully functional — the only thing you lose is our page-view count. Clearing your browser storage removes the local preferences; blocking all cookies stops you staying signed in to the console.",
        ],
      },
    ],
  },

  trust: {
    slug: "/security",
    title: "Trust Center",
    updated: "Effective 1 January 2026",
    summary: "What we can evidence today, and what we have not yet audited.",
    sections: [
      {
        heading: "What is documented",
        body: [
          "Our security model — fail-closed screening, signed evidence, tenant isolation, input handling — is published on the Security Model page and describes the controls the running product actually enforces.",
          "Subprocessors are listed in the Privacy Policy, each bound by a data-processing agreement.",
        ],
      },
      {
        heading: "What is not yet audited",
        body: [
          "Intellirity has not completed an independent SOC 2 Type II or ISO/IEC 27001 audit, and we do not publish pen-test reports. We would rather tell you that plainly than print a badge that cannot be checked.",
          "If independent assurance is a procurement requirement for you, contact us and we will share the current control documentation and the roadmap.",
        ],
      },
      {
        heading: "Data handling",
        body: [
          "We never train models on your traffic. Verdict metadata belongs to you, retention is configurable per workspace, and a sovereign deployment runs the engine inside your own VPC.",
        ],
      },
    ],
  },

  about: {
    slug: "/",
    title: "About Intellirity",
    updated: "Company",
    summary: "What Intellirity is and who builds it.",
    sections: [
      {
        heading: "What we do",
        body: [
          "Intellirity is the security operations layer for AI systems. We sit in front of your models, agents and data pipelines and judge every call for injection, jailbreak and exfiltration in real time, with evidence attached to every verdict.",
          "We were founded by infrastructure and applied-AI engineers who watched the first wave of prompt-injection incidents and concluded that AI needs its own security stack, not a repurposed WAF.",
        ],
      },
      {
        heading: "How we operate",
        body: [
          "Layered detection patterns maintained against current attack technique, policy bundles pinned per model, and an immutable evidence vault on every plan.",
        ],
      },
    ],
  },

  research: {
    slug: "/",
    title: "Research",
    updated: "Adversarial lab",
    summary: "The attack research behind our detection rules.",
    sections: [
      {
        heading: "What we publish",
        body: [
          "Research notes tracking public prompt-injection techniques, jailbreak chains and agent-abuse patterns, with mitigations for every finding we cover.",
          "If you find a novel bypass in this product, report it through the security channel. Valid reports land in the policy bundle.",
        ],
      },
    ],
  },

  careers: {
    slug: "/",
    title: "Careers",
    updated: "Hiring",
    summary: "Open roles at Intellirity.",
    sections: [
      {
        heading: "Open roles",
        body: [
          "We are a small team and we hire slowly.",
          "If you break AI systems for fun and fix them for a living, write to " + CONTACT_EMAIL + " with something you broke and how you fixed it.",
        ],
      },
    ],
  },

  contact: {
    slug: "/",
    title: "Contact",
    updated: "Reach us",
    summary: "How to reach the team.",
    sections: [
      {
        heading: "Channels",
        body: [
          "Sales and general questions: " + CONTACT_EMAIL + ". We reply on business days.",
          "Security issues: " + SECURITY_EMAIL + ". Encrypted reports welcome, triaged first, safe-harbor for good-faith research.",
          "Legal and privacy: " + LEGAL_EMAIL + ".",
        ],
      },
    ],
  },

  disclosure: {
    slug: "/security",
    title: "Coordinated Disclosure",
    updated: "Effective 1 January 2026",
    summary: "How to report a vulnerability, and what happens next.",
    sections: [
      {
        heading: "Policy",
        body: [
          "If you find a vulnerability in Intellirity, tell us first at " + SECURITY_EMAIL + ".",
          "We acknowledge within 24 hours, ship a fix or mitigation within 30 days, and credit researchers publicly unless you prefer anonymity. Good-faith research is authorized and will never be pursued legally.",
        ],
      },
    ],
  },

  status: {
    slug: "/",
    title: "Status",
    updated: "Live",
    summary: "Current platform state.",
    sections: [
      {
        heading: "Current state",
        body: [
          "Engine health and the live verdict stream are reported in the console, which is where the engine actually runs.",
          "Verdict latency is measured per scan and reported in the console rather than on a marketing page, so the number you see is the number the engine produced.",
        ],
      },
    ],
  },

  changelog: {
    slug: "/",
    title: "Changelog",
    updated: "Shipping",
    summary: "What changed.",
    sections: [
      {
        heading: "Detection and trust",
        body: [
          "Sixteen detection engines behind one API, with signed proof-of-intent certificates, a hash-chained audit ledger and exactly-once escrow for autonomous spend.",
          "A screening reverse proxy that judges prompts before upstream spend and screens replies before delivery.",
        ],
      },
    ],
  },
};

export const legalDoc = (key: string): LegalDoc | undefined => LEGAL_DOCS[key];
