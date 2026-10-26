/* Blog content.
 *
 * Plain, structured text so the article page can render headings, lists and
 * quotes without a markdown dependency or dangerouslySetInnerHTML. Every
 * article has its own canonical URL and Article schema; the body avoids
 * invented statistics and vendor claims.
 */

export type BlogCategory =
  | "AI Security Fundamentals"
  | "LLM & Chatbot Security"
  | "AI Agent Security"
  | "API Security & Practical Guides";

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  category: BlogCategory;
  date: string;
  readingMinutes: number;
  keywords: string[];
  body: string;
  related: { label: string; href: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "what-is-ai-security",
    title: "What Is AI Security? A Complete Guide for 2026",
    description:
      "AI security protects models, prompts, agents and the data around them. What it covers, how it differs from model safety, and the controls a real deployment needs.",
    category: "AI Security Fundamentals",
    date: "2026-10-26",
    readingMinutes: 8,
    keywords: [
      "AI security",
      "what is AI security",
      "AI security guide",
      "LLM security",
      "AI security controls",
    ],
    body: `AI security is the discipline of protecting artificial intelligence systems from misuse, manipulation, data loss and operational failure. It covers the model, the prompt and response path, the tools an agent can call, the data those tools touch, and the evidence left behind. It is not a single product and it is not model safety with a different name.

## Why AI systems need their own security layer

A traditional web application takes structured input and executes deterministic code. An AI system takes natural language, retrieves untrusted documents, calls tools with real permissions, and produces output that other systems may trust. The boundary between data and instruction is soft. A sentence inside a PDF can become a command. A tool result can redirect an agent. An output can leak a secret that was never meant to leave the building.

That difference changes the threat model. Input validation alone is not enough, because the input is supposed to be arbitrary language. A web application firewall does not understand intent, tool authority or conversation state. AI security adds controls at each of those boundaries.

## The four surfaces to protect

**The input path.** Prompts, uploaded files, retrieved context and tool results are all untrusted. Screening has to detect direct instruction overrides, encoded payloads, jailbreak framing and indirect injection hidden in content the model is asked to summarize.

**The model boundary.** Model provenance, version and integrity matter. A model that behaves correctly in testing and differently in production is a supply-chain problem, not a prompt problem. Track what was deployed, where it came from, and whether its artefacts match the approved hash.

**The action path.** Agents call tools, move money, send email and change records. Security here is policy: which tools may run, with what arguments, under whose authority, and when a human must approve. An agent with broad credentials and no action policy is an incident waiting to happen.

**The data path.** Personal data, credentials, source code and regulated records can enter a prompt or leave in a response. Detection must cover both directions, with redaction where possible and blocking where not. Data-flow tracking shows which destinations actually received what.

## Detection, enforcement and evidence

Detection without enforcement is monitoring. A useful AI security system returns a verdict for every call and then enforces it: allow, flag, redact or block. The policy needs to be versioned and reviewable, because changing a guardrail changes production behaviour.

Evidence is the third leg. For every decision, record the input hash, the controls that ran, the verdict, the policy version and the action taken. A tamper-evident log lets you reconstruct an incident weeks later and show a regulator or customer exactly what happened. Without it, an argument about whether a block was correct becomes a matter of memory.

## What AI security is not

It is not a claim that a model is safe in every context. It is not a certification badge. It is not a single regex that looks for the word "ignore". It is a set of controls around a probabilistic system, designed so that a bad output does not automatically become a bad action.

It is also not only for large companies. A startup shipping a chatbot that reads customer documents has the same injection and data-loss problems at smaller scale. The free controls are still worth having: a known-good model, least-privilege tool credentials, output redaction, and a log.

## A practical starting sequence

1. Inventory every model endpoint, agent and tool in production.
2. Put a screening gateway in front of model calls so prompts and responses are judged before they cross a boundary.
3. Remove standing credentials from agents; issue scoped, short-lived permissions.
4. Add data-loss detection in both directions.
5. Record every verdict in an append-only log.
6. Test the controls with the attacks you expect, not only with happy-path prompts.

AI security is ultimately about making the consequences of a wrong model output small, visible and reversible. The model will sometimes be wrong. The system around it should not be.`,
    related: [
      { label: "See the detection engines", href: "/engines" },
      { label: "AI security glossary", href: "/glossary" },
      { label: "Read the security model", href: "/security" },
    ],
  },
  {
    slug: "top-10-ai-security-threats",
    title: "Top 10 Security Threats Facing AI Applications",
    description:
      "The ten AI security threats that show up in real deployments, from prompt injection and data exfiltration to agent abuse and denial of wallet — with the control that addresses each.",
    category: "AI Security Fundamentals",
    date: "2026-10-24",
    readingMinutes: 9,
    keywords: [
      "AI security threats",
      "top AI security risks",
      "LLM threats",
      "AI application security",
      "OWASP LLM Top 10",
    ],
    body: `Most AI incidents are not exotic. They combine a familiar web vulnerability with a model that was given more trust than the data deserved. These are the ten threats we see most often, and the control that actually reduces each one.

## 1. Prompt injection

An attacker puts instructions in text the model reads as data: a user prompt, a retrieved document, a web page, a tool result. The model follows them. Direct injection arrives in the prompt; indirect injection arrives through content the system fetched. The control is screening both the prompt and every retrieved or tool-returned block before the model acts on it.

## 2. Jailbreaks and policy bypass

A jailbreak persuades the model to ignore its own safety policy through roleplay, encoding, translation or a long multi-turn story. It is different from injection: injection hijacks the task, a jailbreak removes the guardrail. Detection needs to read intent and structure across the conversation, not match a single phrase.

## 3. Sensitive data disclosure

Models repeat what they have seen. A retrieval system that indexes too much can surface another customer's record. A prompt can ask for secrets, system instructions or internal identifiers. The controls are retrieval scoping, output DLP, redaction, and testing that the model cannot be talked into revealing context it should not have.

## 4. Data exfiltration through outputs

This is the outbound version: the model is convinced to place data in a URL, an image tag, a markdown link or a tool call that leaves the environment. Blocking outbound destinations and inspecting generated URLs and images matters more than inspecting the prompt alone.

## 5. Insecure tool and plugin use

Tools turn a text problem into an action problem. A plugin with a broad OAuth token, a shell tool with no allowlist, or a database tool that accepts raw SQL gives the model real authority. Use least privilege, per-tool schemas, argument validation and human approval for destructive actions.

## 6. Excessive agency

An agent that can plan, browse, write and pay without checkpoints will eventually do something expensive. Excessive agency is a design flaw. Bound the goal, the number of steps, the spend and the set of reachable systems. Require proof of intent for high-impact actions.

## 7. Model and supply-chain compromise

A model file, adapter, container or dependency can be swapped. The system then behaves normally in tests and maliciously in production. Verify provenance, pin hashes, scan artefacts and treat model updates like code deployments.

## 8. Denial of wallet

Recursive prompts, runaway loops or abusive clients consume tokens until the bill or a quota stops them. Rate limits per user are not enough; add per-session token and cost ceilings, loop detection and alerts before the invoice arrives.

## 9. Insecure output handling

The model's output is untrusted input to the next system. If it is rendered as HTML, executed as code, passed to a shell or used to build a query, it can carry XSS, command injection or SQL injection. Encode, validate and sandbox downstream use exactly as you would for any user input.

## 10. Weak observability and evidence

If you cannot reconstruct what the model saw, which controls ran and what action was taken, you cannot investigate an incident or defend a decision. Log input hashes, verdicts, policy versions and actions in an append-only, tamper-evident store. Keep enough context to explain the decision without retaining raw traffic longer than necessary.

## How the threats combine

A single incident often chains several of these. An indirect injection in a retrieved page convinces an agent to call a tool with a broad token, which exfiltrates data through a generated URL, and the only evidence is a normal-looking completion. Defence in depth is not a slogan here; each boundary needs its own check.

Start with the controls that reduce blast radius: least privilege, output handling, spend ceilings and evidence. Then improve detection. A perfect classifier with an all-powerful agent is still an incident waiting to happen.`,
    related: [
      { label: "Detection engines and coverage", href: "/engines" },
      { label: "Prompt injection explained", href: "/blog/prompt-injection-attacks" },
      { label: "AI security checklist", href: "/blog/ai-security-checklist" },
    ],
  },
  {
    slug: "ai-security-vs-cybersecurity",
    title: "AI Security vs. Traditional Cybersecurity: What's the Difference?",
    description:
      "Traditional security protects deterministic systems. AI security also has to reason about intent, probabilistic output and delegated authority. Where the disciplines overlap and where they diverge.",
    category: "AI Security Fundamentals",
    date: "2026-10-22",
    readingMinutes: 7,
    keywords: [
      "AI security vs cybersecurity",
      "AI security",
      "traditional cybersecurity",
      "LLM security",
      "AI risk",
    ],
    body: `AI security and traditional cybersecurity share the same goal: keep attackers from causing harm through a system. They share controls too — identity, least privilege, patching, logging, network boundaries. The difference is what the system does with input, and how much authority the output carries.

## Deterministic systems vs probabilistic systems

A conventional application maps input to behaviour through code you can read. If a parameter is validated and a query is parameterized, the same input produces the same result. Security testing can enumerate the paths.

An AI application maps language to behaviour through a model. The same input can produce different output. The model can be persuaded, confused or steered by content that was never meant as an instruction. You cannot enumerate every input, and correctness is a distribution rather than a guarantee.

That does not make traditional controls obsolete. It means they are necessary but not sufficient.

## The instruction/data boundary is soft

In a web application, the difference between code and data is enforced by the runtime. In an LLM application, both arrive as text. A retrieved document can contain a sentence that reads like an instruction, and the model may follow it. This is why prompt injection is a category of its own rather than a subclass of input validation.

AI security therefore adds content screening and provenance: where did this block of text come from, what is it allowed to influence, and should it be allowed to trigger an action at all?

## Output is untrusted input

Traditional systems already treat user input as hostile. AI systems must treat model output the same way. A completion can contain HTML, a shell command, a URL, a SQL fragment or a tool call. If the next component trusts it, the model becomes an injection vector into systems that were previously safe.

The control is familiar: encode, validate, sandbox and authorize at the boundary. The novelty is that the payload was generated by your own system.

## Authority is delegated, not just authenticated

A user session has permissions. An agent acting for that user may have more: API tokens, browser sessions, payment credentials, write access to records. Traditional identity answers "who is calling". AI security also has to answer "what is this agent allowed to do on whose behalf, and how do we prove it".

That is why action policy, scoped credentials, spend ceilings and proof of intent sit in the AI security layer. They are authorization controls for a delegated actor that can make decisions.

## The overlap is real

AI systems still need patched dependencies, secret management, TLS, tenant isolation, rate limits and audit logs. A model endpoint exposed without authentication is the same mistake as an unauthenticated database. The AI-specific controls sit on top of a conventional security baseline; they do not replace it.

## A useful way to split the work

- **Traditional security owns** the infrastructure, identity, network, secrets, dependency and data-store controls.
- **AI security owns** prompt and response screening, retrieval provenance, tool and action policy, agent authority, model supply chain, output handling and AI-specific evidence.
- **Both own** logging, incident response and access review.

If a team is building its first AI feature, the fastest improvement is usually not a better classifier. It is removing standing credentials from the agent, constraining its tools, treating its output as hostile, and logging every decision. Those are familiar disciplines applied to a new kind of actor.`,
    related: [
      { label: "What is AI security?", href: "/blog/what-is-ai-security" },
      { label: "The Intellirity security model", href: "/security" },
      { label: "AI security glossary", href: "/glossary" },
    ],
  },
  {
    slug: "prompt-injection-attacks",
    title: "Prompt Injection Attacks: How They Work and How to Prevent Them",
    description:
      "Direct and indirect prompt injection, why filtering keywords fails, and the layered controls that stop untrusted text from becoming an instruction.",
    category: "LLM & Chatbot Security",
    date: "2026-10-20",
    readingMinutes: 8,
    keywords: [
      "prompt injection",
      "prompt injection attack",
      "indirect prompt injection",
      "prompt injection prevention",
      "LLM security",
    ],
    body: `Prompt injection is an attack where text the model is supposed to treat as data is interpreted as an instruction. It is the most common AI-specific vulnerability because language models have no hard boundary between the two.

## Direct injection

Direct injection arrives in the user's own message. The attacker is the user, and the goal is usually to override the system prompt, extract it, or make the model perform a task it was told not to perform.

A simple example is a request to ignore previous instructions and reveal the hidden prompt. More sophisticated versions use roleplay, translation, encoding, nested quotes or a long narrative that gradually moves the model away from its policy.

## Indirect injection

Indirect injection is more dangerous in production because the attacker is not the person using the system. The payload arrives through content the application fetches: a web page being summarized, a PDF being analyzed, an email being triaged, a code comment, a tool result, a calendar invite.

The model reads the document, encounters a line that says the assistant must now send data to a URL or call a tool, and may comply. The user sees a normal answer. The action has already happened.

## Why keyword filters fail

A blocklist for phrases like "ignore previous instructions" catches naive attacks and almost nothing else. Attackers use synonyms, other languages, base64, homoglyphs, zero-width characters, markdown, JSON, roleplay and multi-turn setups. Benign text also contains the same phrases in security documentation, so a keyword filter produces false positives and false confidence.

Detection has to combine pattern analysis, structure, conversation state and the context of where the text came from. It will never be perfect; the design must assume some attacks get through.

## Layer the controls

**1. Label provenance.** Every block of text should carry its source: user, system, retrieved document, tool output. The model prompt should make clear which sources are trusted for instructions and which are data only.

**2. Screen before the model.** Run injection detection on the user prompt and on retrieved/tool content. Return a verdict and a reason. Block high-risk payloads; flag ambiguous ones for review or a constrained response.

**3. Constrain the model's authority.** Injection becomes serious when the model can act. A model that can only produce text has a smaller blast radius than one with a shell, a database and a payment token. Remove standing credentials and require approval for high-impact tools.

**4. Validate tool calls.** Do not let the model construct arbitrary requests. Give each tool a schema, validate arguments, enforce an allowlist of destinations and apply per-session limits.

**5. Screen output.** Check for secrets, personal data and generated URLs or images that could exfiltrate data. Treat the completion as untrusted input to the next system.

**6. Log evidence.** Record the input hash, the source blocks, the verdict, the policy and the action. If an injection succeeds, the log is how you find out what it did.

## What to test

Test direct overrides, encoded payloads, instructions hidden in HTML comments, instructions split across retrieved chunks, tool outputs that claim new authority, and multi-turn escalation. Test benign content that mentions injection too, so you can measure false positives.

Prompt injection is not a bug you close once. It is a boundary you keep enforcing as models, prompts and tools change. The practical goal is not "no injection ever"; it is "no injection becomes an unauthorized action, and every attempt is visible".`,
    related: [
      { label: "Injection detection engines", href: "/engines" },
      { label: "Secure AI chatbots", href: "/blog/secure-ai-chatbots" },
      { label: "Prompt injection definition", href: "/glossary#prompt-injection" },
    ],
  },
  {
    slug: "secure-ai-chatbots",
    title: "How to Secure AI Chatbots Against Cyberattacks",
    description:
      "A practical security baseline for customer-facing and internal AI chatbots: identity, prompt injection, data boundaries, output handling, abuse controls and evidence.",
    category: "LLM & Chatbot Security",
    date: "2026-10-18",
    readingMinutes: 8,
    keywords: [
      "secure AI chatbot",
      "AI chatbot security",
      "chatbot prompt injection",
      "LLM chatbot security",
      "AI chatbot attacks",
    ],
    body: `An AI chatbot is a public, untrusted input surface connected to a model that may have access to private data and tools. That combination needs the same discipline as any internet-facing application, plus controls for the model-specific risks.

## Start with identity and tenancy

Know who is talking to the bot before it retrieves anything. Anonymous chat can be fine for marketing, but it must not reach customer records, internal documents or tools. Authenticate the user, resolve the tenant, and scope every retrieval and tool call to that tenant.

Do not let the model choose the tenant from the conversation. Tenant selection is an authorization decision made by your code from the session, never from a string the model can produce.

## Treat every message as hostile

The user message is attacker-controlled. So are uploaded files, pasted text, fetched URLs, retrieved documents and tool results. Screen the whole set for prompt injection, encoded payloads and instructions embedded in content.

A chatbot that summarizes a web page is an indirect injection target even if its own users are trusted. The page is the attacker.

## Keep secrets out of the prompt

System prompts are not a vault. Do not put API keys, database credentials or internal URLs in them. Models can be persuaded to repeat context, and logs may retain it. Use short-lived credentials held by the application, injected into a tool call only after authorization.

## Constrain retrieval

Retrieval is where data leaks happen. Index only what the user is allowed to see, filter by tenant and permission at query time, and return the minimum number of chunks. Do not rely on the model to ignore a document it should not have received.

## Control the output path

The completion is untrusted. If you render markdown, sanitize HTML. If you turn links into clickable URLs, validate the destination. If you pass the output to another system, treat it as user input: parameterize queries, avoid shell execution, and never eval model text.

For customer-facing chat, also screen for abuse categories and personal data, and redact where policy requires it. Keep the decision and the reason, not just the final text.

## Add abuse and cost controls

Public chatbots attract automated abuse. Rate limit per IP and per account, cap message length, cap conversation length, and set per-session token and cost ceilings. Detect loops and repeated retries. A denial-of-wallet attack does not need a sophisticated prompt; it needs volume.

## Log enough to investigate

Record the user/tenant, input hash, retrieval identifiers, controls that ran, verdict, model and policy version, and action. Avoid storing raw sensitive content longer than necessary. The goal is to reconstruct the decision without turning the log into a second data breach.

## Test like an attacker

Run a small adversarial suite on every release: direct overrides, roleplay jailbreaks, encoded instructions, hidden text in documents, requests for the system prompt, attempts to reach another tenant, and payloads that try to make the bot emit a URL. Include benign security questions to catch false positives.

## A minimum viable baseline

- Authenticated, tenant-scoped retrieval
- Injection screening on user and retrieved content
- No secrets in the prompt
- Output sanitization and URL validation
- Per-session rate and spend ceilings
- Append-only decision log
- A tested incident path for disabling the bot

None of these require a large team. They require deciding that the chatbot is a security boundary, not a demo.`,
    related: [
      { label: "Prompt injection attacks", href: "/blog/prompt-injection-attacks" },
      { label: "AI data loss prevention", href: "/engines" },
      { label: "AI security checklist", href: "/blog/ai-security-checklist" },
    ],
  },
  {
    slug: "llm-security-vulnerabilities",
    title: "LLM Security: Common Vulnerabilities and Best Practices",
    description:
      "The vulnerabilities that recur across LLM applications — insecure output handling, excessive agency, retrieval leaks, model supply chain and more — with the practices that reduce them.",
    category: "LLM & Chatbot Security",
    date: "2026-10-16",
    readingMinutes: 9,
    keywords: [
      "LLM security",
      "LLM vulnerabilities",
      "large language model security",
      "LLM best practices",
      "OWASP LLM",
    ],
    body: `LLM applications fail in patterns. The model is new, but most of the failures are familiar security problems wearing a new interface. These are the ones that recur, and the practices that address them.

## Insecure output handling

The completion is treated as trusted. It is rendered as HTML, interpolated into a query, passed to a shell or used to build a tool request. An attacker who can influence the output — through the prompt, retrieved content or a tool result — can inject into the downstream system.

Practice: treat model output exactly like user input. Encode for the target context, validate schemas, parameterize queries and never execute model text.

## Excessive agency

The application gives the model tools with broad permissions and no checkpoints. The model can read any file, call any API, spend money or send email. A small prompt error becomes a large action.

Practice: least privilege per tool, narrow schemas, allowlisted destinations, per-session limits and human approval for destructive or financial actions.

## Prompt injection and jailbreaks

Instructions hidden in data, or persuasion that removes the safety policy. Both are content-layer attacks that no single filter solves.

Practice: provenance labels, screening of user and retrieved content, constrained authority, output checks and evidence. Assume some payloads get through and make the consequence small.

## Sensitive information disclosure

The model reveals system prompts, another tenant's data, credentials or internal identifiers. Causes include over-broad retrieval, secrets in prompts, verbose errors and memorized training data.

Practice: tenant-scoped retrieval, no secrets in prompts, output DLP, minimal error detail and redaction.

## Retrieval and embedding weaknesses

Vector stores inherit whatever permissions the ingestion job had. If documents from multiple tenants share an index without filters, similarity search can return the wrong tenant's text. Embeddings can also leak information about their source.

Practice: partition by tenant, enforce permissions at query time, re-index on permission changes and keep sensitive documents out of shared indexes.

## Supply chain and model integrity

Adapters, model files, inference containers, SDKs and plugins can be swapped or compromised. A model update can change behaviour without changing your code.

Practice: pin versions and hashes, verify provenance, scan artefacts, review model changes like code and keep a rollback path.

## Unbounded consumption

Long prompts, recursive agents and abusive clients consume tokens and money. The application has no per-session ceiling.

Practice: input limits, token and cost budgets per session, loop detection, rate limits and alerts. Treat spend as a security control, not only a billing concern.

## Overreliance and unsafe defaults

Users and downstream systems trust the output because it sounds confident. The model is used for decisions it should not make alone, without verification.

Practice: label generated content, require confirmation for consequential actions, keep a human in the loop and design for the model being wrong.

## Weak observability

There is no record of what the model saw or why an action happened. Incident response becomes guesswork.

Practice: log input hashes, retrieval ids, controls, verdicts, policy versions and actions in a tamper-evident store. Retain the minimum necessary.

## Best practices that cut across all of them

- Put a screening gateway in front of model calls.
- Make authorization decisions in code, never in the prompt.
- Treat retrieved content and tool output as hostile.
- Give agents the smallest authority that still works.
- Validate and encode every output boundary.
- Cap spend and steps per session.
- Test with adversarial prompts on every release.
- Keep evidence for every verdict.

LLM security is not a property of the model. It is a property of the system around the model.`,
    related: [
      { label: "AI security detection engines", href: "/engines" },
      { label: "Prompt injection prevention", href: "/blog/prompt-injection-attacks" },
      { label: "LLM firewall definition", href: "/glossary#llm-firewall" },
    ],
  },
  {
    slug: "ai-agent-security",
    title: "AI Agent Security: Risks, Challenges, and Solutions",
    description:
      "Agents turn model errors into real actions. How to bound authority, govern tools, control spend and keep evidence when an autonomous system acts on your behalf.",
    category: "AI Agent Security",
    date: "2026-10-14",
    readingMinutes: 9,
    keywords: [
      "AI agent security",
      "autonomous agent security",
      "agent guardrails",
      "MCP security",
      "AI agent risks",
    ],
    body: `An AI agent is a model with a loop, tools and a goal. That combination is useful and dangerous: the model can now change the world, not just describe it. Agent security is the discipline of bounding what that loop can do.

## The core risks

**Goal hijacking.** An injected instruction inside a web page or tool result changes the agent's objective. The agent pursues the attacker's goal while appearing to work on yours.

**Tool abuse.** The agent calls a tool with arguments it should not use: a broader query, a different recipient, a destructive command, a payment to an unknown account.

**Privilege escalation.** The agent has a broad token, can create new credentials, or can reach a system that grants more authority. One compromised step expands the blast radius.

**Runaway loops.** The agent retries, plans, calls and retries without a step or spend ceiling. The bill grows and the side effects accumulate.

**Data exfiltration.** The agent sends data out through a tool, a URL, an image or an email. The outbound path is the leak.

**Silent failure.** The agent reports success while the action failed or did something different. Without evidence, nobody can tell.

## Design the authority before the prompt

Start with the question: if this agent is fully compromised, what is the worst it can do? Then reduce that until the answer is acceptable.

- Give each tool its own scoped credential, not a shared god token.
- Make credentials short-lived and audience-bound.
- Allowlist destinations, recipients, tables and commands.
- Separate read tools from write tools, and require approval for destructive writes.
- Cap steps, tokens, spend and wall-clock time per run.
- Make the agent's tenant and user explicit in code, never inferred from model text.

## Tool governance

Every tool is an API contract. Define a schema, validate arguments server-side and reject anything outside the contract. A tool that accepts free-form SQL, shell or URLs is a remote execution surface.

Log the tool name, arguments hash, decision and result. If a tool cannot be logged safely, it probably should not be exposed to an agent.

## MCP and third-party tools

The Model Context Protocol makes it easy to connect many tools. It also makes supply chain and confused-deputy risks easy to inherit. Audit tool descriptions for poisoning, constrain scopes, pin server versions and verify which server is actually being called. A trusted server used to reach something it should not is still a breach.

## Human approval that means something

"Are you sure?" is not approval. A useful approval shows the exact action, the arguments, the amount, the recipient and the authority behind it, then records a signed decision. For high-impact actions, require a second approver or a proof-of-intent certificate bound to that action and scope.

## Evidence for autonomous actions

Record the goal, the plan, each tool call, each verdict, the approval and the outcome. Chain the records so later edits are detectable. When an agent moves money or deletes a record, the evidence is the difference between an audit and an argument.

## Test the failure modes

Run exercises where a retrieved page tries to change the goal, a tool returns a malicious instruction, a credential is missing, a loop exceeds its budget and a write is attempted without approval. Verify the system fails closed and leaves evidence.

## The practical rule

An agent should have the smallest authority, the shortest credentials, the tightest loop and the clearest evidence that still lets it do the job. If that feels restrictive, the alternative is an autonomous system whose mistakes you cannot bound.`,
    related: [
      { label: "Agent Guard and MCP controls", href: "/engines" },
      { label: "How hackers exploit agents", href: "/blog/how-hackers-exploit-ai-agents" },
      { label: "Proof of intent", href: "/glossary#proof-of-intent" },
    ],
  },
  {
    slug: "how-hackers-exploit-ai-agents",
    title: "How Hackers Exploit AI Agents and How to Protect Them",
    description:
      "The attack paths attackers actually use against agents — indirect injection, tool confusion, credential reuse, exfiltration and loop abuse — and the controls that break each chain.",
    category: "AI Agent Security",
    date: "2026-10-12",
    readingMinutes: 8,
    keywords: [
      "exploit AI agents",
      "AI agent attacks",
      "agent prompt injection",
      "agent security",
      "AI agent exploitation",
    ],
    body: `Attackers do not need a new class of exploit for agents. They need a way to get text in front of the model and a tool with enough authority to act on it. The attack chain usually has four stages: reach, influence, act and hide.

## Stage 1: Reach

The attacker needs content the agent will read. Common paths are a web page the agent browses, an email it triages, a document it summarizes, a code comment it reviews, a calendar invite, a support ticket or a tool result from a third-party API.

Anything the agent treats as context is an input surface. If the agent can browse arbitrary URLs, the attacker can host the payload. If it reads shared documents, any contributor can plant it.

## Stage 2: Influence

The payload tries to change the agent's goal or authority. It may claim to be a system update, a new policy, a higher-priority instruction, or a message from the user's manager. It may be split across chunks, encoded, or hidden in HTML comments and metadata.

The model does not need to be fully jailbroken. A small change — send the summary to this address, call this endpoint first, include this token — is enough.

## Stage 3: Act

The agent uses a tool. The attacker's advantage is any tool with broad scope: a shell, a database, an email sender, a payment API, a browser with the user's cookies, a cloud credential.

Common escalations:
- Reusing a long-lived token found in the environment.
- Calling a tool with a different recipient or table than intended.
- Creating a new credential or inviting a new user.
- Writing to a public location and reading it back.
- Triggering a webhook to an attacker-controlled URL.

## Stage 4: Hide

The agent reports success in normal language. The malicious step is buried among legitimate ones. Without per-step evidence, the operator cannot tell what happened.

Attackers also exploit retries: a failed action may be retried with adjusted arguments until it succeeds.

## Breaking the chain at each stage

**Reach:** restrict browsing to allowlisted domains; treat all retrieved content as hostile; label provenance; isolate untrusted content from instructions.

**Influence:** screen retrieved and tool content for injection; use a model prompt that makes data/instruction separation explicit; cap how much untrusted text can influence a plan.

**Act:** least-privilege tools, scoped short-lived credentials, argument validation, destination allowlists, step/spend caps and human approval for irreversible actions.

**Hide:** log every step with arguments hash, verdict and result; chain the log; alert on unusual tool sequences; make the agent's plan visible before execution for high-impact tasks.

## What attackers look for in your design

- A single API key shared by all tools.
- A browser tool with no domain allowlist.
- An email tool that accepts arbitrary recipients.
- A database tool that accepts raw queries.
- An agent that can install packages or run shell commands.
- No approval for payments or deletions.
- No cap on steps or spend.
- Logs that only record the final answer.

## A useful exercise

Give a red team the agent and nothing else. Ask them to make it send a file to an external address, change a record they should not touch, or spend above a limit. Watch where the chain breaks. If the answer is "the model refused", that is not a control; models can be persuaded. If the answer is "the tool had no permission", you have a boundary.

Agent security is mostly authorization engineering around a probabilistic planner. The planner will be wrong. The boundaries should still hold.`,
    related: [
      { label: "AI agent security", href: "/blog/ai-agent-security" },
      { label: "Agent and MCP engines", href: "/engines" },
      { label: "Denial of wallet", href: "/glossary#denial-of-wallet" },
    ],
  },
  {
    slug: "api-security-for-ai-applications",
    title: "API Security for AI Applications: A Complete Developer's Guide",
    description:
      "Authentication, authorization, rate limits, prompt and output validation, tenant isolation, key management and logging for the APIs that front AI models.",
    category: "API Security & Practical Guides",
    date: "2026-10-08",
    readingMinutes: 10,
    keywords: [
      "API security for AI",
      "AI API security",
      "LLM API security",
      "AI application security",
      "secure AI API",
    ],
    body: `Every AI feature eventually becomes an API call. A frontend asks your backend, your backend asks a model, and the model may call tools. The security of the whole system depends on the boundaries between those hops.

## Authenticate the caller, not the model

The model must never be the authority for who the user is. Resolve identity from a session or signed token in your backend, then pass a tenant and user context to the model layer. Do not accept a user id, tenant id or role from the prompt.

Use short-lived access tokens, validate issuer and audience, and reject tokens minted for another origin. Keep machine credentials separate from human sessions and scope them to specific operations.

## Authorize every operation

Authentication answers who; authorization answers what. Check permission at the API boundary for the resource being touched, not only at login. An agent acting for a user needs a delegated scope that is narrower than the user's full account.

For tool calls, authorize per tool and per argument class. A read-only reporting tool should not be able to delete records because the model asked nicely.

## Validate input shape and size

Cap request size, message count, attachment size and URL length before doing any model work. Reject unexpected fields. Validate JSON schemas. This is ordinary API hygiene, but AI endpoints often skip it because the payload is "just text".

Also screen the content: prompt injection, encoded payloads, secrets and personal data. Input validation and content screening are different controls; you need both.

## Treat model output as untrusted

The response may contain HTML, markdown, URLs, code or tool instructions. Validate it against the expected schema before returning it. Encode for the client context. If your API returns a URL, restrict the scheme and host. If it returns code, do not execute it.

Add output DLP for secrets, credentials and personal data. Redact where policy allows; block where it does not.

## Isolate tenants at every layer

Tenant isolation is not a filter in the UI. It is a condition on every query, retrieval, cache key, log row and tool credential. A vector search must filter by tenant before similarity; a cache key must include the tenant; a tool token must be scoped to the tenant.

Test it with two accounts and an attempt to reference the other tenant's identifiers. If the model can name an object the caller does not own, the boundary is wrong.

## Rate limit by identity, not only IP

IP limits protect against crude floods. They do not stop an authenticated user from running expensive prompts. Limit per user, per tenant and per endpoint, with separate budgets for expensive operations such as long-context calls or tool execution.

Add cost ceilings per session and per day. Return a clear 429 with a retry hint.

## Protect upstream credentials

Never ship a model provider key to the browser. Keep it server-side, rotate it, and use separate keys per environment. If users bring their own key, encrypt it at rest and never log it. For tools, prefer short-lived tokens issued per request over long-lived secrets stored in the agent's environment.

## Log the decision, not the secret

Record request id, tenant, endpoint, model, token counts, controls executed, verdict, latency and action. Hash sensitive input rather than storing it raw. Keep enough to investigate without creating a second data store of customer content.

## A compact API checklist

- Session or signed token validated server-side
- Tenant and role derived from the token, never from the body
- Per-operation authorization
- Request size and schema limits
- Prompt and content screening
- Output schema validation and encoding
- DLP on responses
- Tenant-scoped retrieval and cache keys
- Per-user and per-tenant rate limits
- Spend ceilings
- No provider secrets in the client
- Structured, privacy-aware logs

Most AI API breaches are not model exploits. They are ordinary authorization and validation mistakes around a new kind of payload. Get those right first.`,
    related: [
      { label: "Deploy the screening gateway", href: "/engines" },
      { label: "AI security checklist", href: "/blog/ai-security-checklist" },
      { label: "AI security glossary", href: "/glossary" },
    ],
  },
  {
    slug: "ai-security-checklist",
    title: "The Ultimate AI Security Checklist for Developers and Startups",
    description:
      "A prioritized checklist for shipping AI features: identity, prompts, retrieval, agents, output handling, spend, evidence and incident response.",
    category: "API Security & Practical Guides",
    date: "2026-10-02",
    readingMinutes: 9,
    keywords: [
      "AI security checklist",
      "AI security for startups",
      "LLM security checklist",
      "AI developer security",
      "secure AI deployment",
    ],
    body: `This is the checklist we would use before putting an AI feature in front of real users. It is ordered by blast radius: the items at the top prevent the worst outcomes even if detection fails.

## Identity and tenancy

- [ ] Every AI endpoint requires an authenticated session or a scoped machine key.
- [ ] Tenant and user are derived server-side, never from the prompt or request body.
- [ ] Every retrieval query, cache key and tool credential is tenant-scoped.
- [ ] A second account cannot read the first account's objects by guessing an id.
- [ ] Admin and support access is explicit, logged and reviewed.

## Prompts and model calls

- [ ] No secrets, internal URLs or credentials in the system prompt.
- [ ] The prompt labels which content is data and which is instruction.
- [ ] User input, retrieved documents and tool results are screened for injection.
- [ ] Request size and conversation length are capped.
- [ ] The model and version are pinned and recorded with each request.
- [ ] A known-good fallback exists when the model provider is unavailable.

## Retrieval

- [ ] Only documents the user may see are indexed for that tenant.
- [ ] Permissions are checked at query time, not only at ingestion.
- [ ] Retrieved chunks are treated as untrusted content.
- [ ] Sensitive collections are excluded or separately governed.
- [ ] Re-indexing happens when permissions change.

## Agents and tools

- [ ] Each tool has its own scoped, short-lived credential.
- [ ] Tool arguments are validated against a schema.
- [ ] Destinations, recipients, tables and commands are allowlisted where possible.
- [ ] Destructive and financial actions require human approval or proof of intent.
- [ ] Steps, tokens, spend and wall-clock time are capped per run.
- [ ] MCP servers are inventoried, version-pinned and audited.
- [ ] The agent cannot install packages or open a shell unless that is the product.

## Output handling

- [ ] Model output is treated as untrusted input by every downstream system.
- [ ] HTML and markdown are sanitized.
- [ ] Generated URLs and images are restricted to allowed schemes and hosts.
- [ ] SQL and shell use parameterization, never string interpolation.
- [ ] DLP checks secrets, credentials and personal data before the response leaves.
- [ ] Generated content is labelled where users could mistake it for verified fact.

## Abuse and cost

- [ ] Rate limits exist per IP, per user and per tenant.
- [ ] Expensive endpoints have their own budgets.
- [ ] Per-session token and cost ceilings are enforced.
- [ ] Loops and repeated retries are detected.
- [ ] Alerts fire before the invoice, not after.

## Evidence and response

- [ ] Every verdict is logged with input hash, controls, policy version and action.
- [ ] The log is append-only or tamper-evident.
- [ ] Sensitive content is not retained longer than necessary.
- [ ] There is a tested way to disable the feature or the model quickly.
- [ ] An incident runbook names who is called and what is preserved.
- [ ] A tabletop exercise has been run with a realistic injection scenario.

## Supply chain

- [ ] Model artefacts and adapters are hashed and verified.
- [ ] Inference containers and SDKs are pinned and scanned.
- [ ] Model updates go through review and can be rolled back.
- [ ] Third-party tools and MCP servers have an owner and a review date.

## What to do first

If you can only do five things this week:

1. Remove standing credentials from agents and scope every tool.
2. Put a screening gateway in front of prompts and responses.
3. Treat model output as hostile at every downstream boundary.
4. Add per-session spend caps.
5. Log every verdict in a store you can trust.

That sequence reduces blast radius before it tries to improve classification. Detection will always miss something; the boundaries are what keep a miss from becoming an incident.`,
    related: [
      { label: "See the engines in action", href: "/engines" },
      { label: "API security guide", href: "/blog/api-security-for-ai-applications" },
      { label: "Pricing and modules", href: "/pricing" },
    ],
  },
];

export const BLOG_CATEGORIES: BlogCategory[] = [
  "AI Security Fundamentals",
  "LLM & Chatbot Security",
  "AI Agent Security",
  "API Security & Practical Guides",
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
