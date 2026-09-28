/* =========================================================
   platform.js: cards built from inline SVG illustrations
   No canvas. Each card visual is a hand-drawn architecture
   diagram in the style of Linear/Vercel.
   ========================================================= */

const capabilities = [
  {
    title: 'Jailbreak & Prompt Injection Shield',
    desc: 'Protects any AI you have built into a website, chatbot, or custom model. Trained on real attack scenarios; flags or blocks attempts to hijack your AI.',
    icon: 'shield',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g1)" rx="4"/>
      <!-- input prompt -->
      <rect x="20" y="32" width="200" height="22" rx="3" fill="none" stroke="#3a4049" stroke-width="1"/>
      <text x="28" y="47" font-family="JetBrains Mono, monospace" font-size="9" fill="#a8a8a3">Ignore previous instructions</text>
      <!-- attack marker -->
      <circle cx="206" cy="43" r="3" fill="#c95a4f"/>
      <!-- shield / verdict -->
      <path d="M 240 28 L 240 60" stroke="#3a4049" stroke-width="1" stroke-dasharray="2 2"/>
      <path d="M 268 28 L 304 28 L 304 60 L 286 70 L 268 60 Z" fill="none" stroke="#d8a24a" stroke-width="1.2"/>
      <path d="M 276 44 L 284 52 L 296 38" fill="none" stroke="#d8a24a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <text x="312" y="48" font-family="JetBrains Mono, monospace" font-size="8" fill="#c95a4f">BLOCK</text>
      <!-- threat log -->
      <line x1="20" y1="80" x2="340" y2="80" stroke="#1c2026" stroke-width="1"/>
      <g font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">
        <text x="20" y="98">14:22:01</text>
        <rect x="74" y="91" width="32" height="11" rx="2" fill="rgba(201,90,79,0.12)"/>
        <text x="80" y="99" fill="#c95a4f">HIGH</text>
        <text x="116" y="98" fill="#e7e7e3">"DAN roleplay"</text>
        <text x="20" y="115">14:21:48</text>
        <rect x="74" y="108" width="32" height="11" rx="2" fill="rgba(201,90,79,0.12)"/>
        <text x="80" y="116" fill="#c95a4f">HIGH</text>
        <text x="116" y="115" fill="#e7e7e3">"reveal system prompt"</text>
        <text x="20" y="132">14:21:33</text>
        <rect x="74" y="125" width="32" height="11" rx="2" fill="rgba(201,90,79,0.12)"/>
        <text x="80" y="133" fill="#c95a4f">HIGH</text>
        <text x="116" y="132" fill="#e7e7e3">"override guardrails"</text>
      </g>
      <!-- bottom stat -->
      <line x1="20" y1="148" x2="340" y2="148" stroke="#1c2026" stroke-width="1"/>
      <text x="20" y="166" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">block rate</text>
      <text x="280" y="166" font-family="Inter Tight" font-size="14" font-weight="500" fill="#fafaf8">99.7%</text>
    </svg>`,
    tags: ['Website', 'SDK', 'Chrome Ext']
  },
  {
    title: 'Real-Time Monitoring',
    desc: 'For anyone running AI or LLMs inside software, a website, or an app. Watch your AI\'s backend live, and stop a problem the moment it appears.',
    icon: 'pulse',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
        <linearGradient id="g2area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(216,162,74,0.25)"/>
          <stop offset="1" stop-color="rgba(216,162,74,0)"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g2)" rx="4"/>
      <!-- grid -->
      <g stroke="#1c2026" stroke-width="0.5">
        <line x1="0" y1="50" x2="360" y2="50"/>
        <line x1="0" y1="100" x2="360" y2="100"/>
        <line x1="0" y1="150" x2="360" y2="150"/>
        <line x1="90" y1="0" x2="90" y2="180"/>
        <line x1="180" y1="0" x2="180" y2="180"/>
        <line x1="270" y1="0" x2="270" y2="180"/>
      </g>
      <!-- area -->
      <path d="M 0 130 L 20 120 L 40 130 L 60 110 L 80 100 L 100 90 L 120 105 L 140 80 L 160 60 L 180 75 L 200 50 L 220 70 L 240 45 L 260 60 L 280 35 L 300 50 L 320 30 L 340 45 L 360 40 L 360 180 L 0 180 Z" fill="url(#g2area)"/>
      <!-- line -->
      <path d="M 0 130 L 20 120 L 40 130 L 60 110 L 80 100 L 100 90 L 120 105 L 140 80 L 160 60 L 180 75 L 200 50 L 220 70 L 240 45 L 260 60 L 280 35 L 300 50 L 320 30 L 340 45 L 360 40" fill="none" stroke="#d8a24a" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
      <!-- last point -->
      <circle cx="360" cy="40" r="3" fill="#d8a24a"/>
      <circle cx="360" cy="40" r="6" fill="none" stroke="rgba(216,162,74,0.3)"/>
      <!-- top label -->
      <text x="20" y="22" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">events / sec</text>
      <text x="80" y="22" font-family="Inter Tight" font-size="13" font-weight="500" fill="#fafaf8">2.4k</text>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'Policy Enforcement for AI',
    desc: 'You set the exact rules for what your AI may and may not do. Guardrails are enforced in real time, so the AI can never step outside the boundaries you define.',
    icon: 'gavel',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g3)" rx="4"/>
      <!-- rule rows -->
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <g transform="translate(20, 26)">
          <rect width="14" height="14" rx="2" fill="#d8a24a"/>
          <path d="M 4 7 L 7 10 L 11 5" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="22" y="11" fill="#e7e7e3">no_pii</text>
          <text x="280" y="11" fill="#6b6b66">block</text>
        </g>
        <g transform="translate(20, 48)">
          <rect width="14" height="14" rx="2" fill="#d8a24a"/>
          <path d="M 4 7 L 7 10 L 11 5" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="22" y="11" fill="#e7e7e3">no_external_url</text>
          <text x="280" y="11" fill="#6b6b66">block</text>
        </g>
        <g transform="translate(20, 70)">
          <rect width="14" height="14" rx="2" fill="#d8a24a"/>
          <path d="M 4 7 L 7 10 L 11 5" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="22" y="11" fill="#e7e7e3">no_exec</text>
          <text x="280" y="11" fill="#6b6b66">block</text>
        </g>
        <g transform="translate(20, 92)">
          <rect width="14" height="14" rx="2" fill="#d8a24a"/>
          <path d="M 4 7 L 7 10 L 11 5" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <text x="22" y="11" fill="#e7e7e3">in_scope</text>
          <text x="280" y="11" fill="#6b6b66">flag</text>
        </g>
        <g transform="translate(20, 114)">
          <rect width="14" height="14" rx="2" fill="none" stroke="#3a4049" stroke-width="1"/>
          <text x="22" y="11" fill="#6b6b66">no_prompt_leak</text>
          <text x="280" y="11" fill="#6b6b66">off</text>
        </g>
      </g>
      <!-- footer -->
      <line x1="20" y1="148" x2="340" y2="148" stroke="#1c2026"/>
      <text x="20" y="166" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">5/5 active</text>
      <circle cx="335" cy="163" r="2" fill="#5fa37a"/>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'Vibe Code Security',
    desc: 'Enter a URL or paste your code. We scan for exposed keys, missing rate limiting, SQL injection, and denial-of-service risks, then show you how to fix each one.',
    icon: 'code',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g4)" rx="4"/>
      <!-- line numbers gutter -->
      <rect x="14" y="18" width="20" height="144" fill="#16191e"/>
      <g font-family="JetBrains Mono, monospace" font-size="9" fill="#4a4a45" text-anchor="end">
        <text x="30" y="36">1</text>
        <text x="30" y="52">2</text>
        <text x="30" y="68">3</text>
        <text x="30" y="84">4</text>
        <text x="30" y="100">5</text>
        <text x="30" y="116">6</text>
        <text x="30" y="132">7</text>
        <text x="30" y="148">8</text>
      </g>
      <!-- code -->
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <text x="40" y="36" fill="#6b6b66">const</text>
        <text x="76" y="36" fill="#e7e7e3">api = require(</text>
        <text x="190" y="36" fill="#5fa37a">"aws-sdk"</text>
        <text x="248" y="36" fill="#e7e7e3">);</text>
        <text x="40" y="52" fill="#6b6b66">const</text>
        <text x="76" y="52" fill="#e7e7e3">KEY =</text>
        <text x="120" y="52" fill="#7d8aa0">process.env</text>
        <text x="190" y="52" fill="#e7e7e3">.AWS_KEY;</text>
        <text x="40" y="68" fill="#d8a24a">app.get</text>
        <text x="86" y="68" fill="#e7e7e3">(</text>
        <text x="90" y="68" fill="#5fa37a">"/u/:id"</text>
        <text x="146" y="68" fill="#e7e7e3">, (req) =&gt; {</text>
        <!-- highlighted line -->
        <rect x="14" y="74" width="332" height="14" fill="rgba(201,90,79,0.10)"/>
        <rect x="14" y="74" width="2" height="14" fill="#c95a4f"/>
        <text x="40" y="84" fill="#e7e7e3">  db.query(</text>
        <text x="106" y="84" fill="#5fa37a">SELECT * WHERE id=</text>
        <text x="226" y="84" fill="#7d8aa0">req.params.id</text>
        <text x="306" y="84" fill="#5fa37a">)</text>
        <text x="40" y="100" fill="#e7e7e3">});</text>
        <text x="40" y="116" fill="#d8a24a">app.listen</text>
        <text x="106" y="116" fill="#e7e7e3">(3000);</text>
        <text x="40" y="148" fill="#6b6b66">// 6 issues found</text>
      </g>
      <!-- finding badge -->
      <rect x="266" y="148" width="80" height="18" rx="3" fill="rgba(201,90,79,0.14)" stroke="rgba(201,90,79,0.3)"/>
      <circle cx="276" cy="157" r="2" fill="#c95a4f"/>
      <text x="282" y="161" font-family="JetBrains Mono, monospace" font-size="8" fill="#c95a4f">SQLi · line 4</text>
    </svg>`,
    tags: ['Website', 'SDK', 'Dashboard']
  },
  {
    title: 'Data Leakage Protection',
    desc: 'Data stays inside your environment, traveling in encrypted form, visible only to the model. A companion tracker maps every destination your AI data reaches.',
    icon: 'lock',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g5" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g5)" rx="4"/>
      <!-- encryption flow -->
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <!-- plaintext -->
        <rect x="20" y="60" width="80" height="40" rx="3" fill="none" stroke="#3a4049" stroke-width="1"/>
        <text x="60" y="84" text-anchor="middle" fill="#a8a8a3">plaintext</text>
        <!-- encrypt -->
        <rect x="140" y="60" width="80" height="40" rx="3" fill="rgba(216,162,74,0.08)" stroke="#d8a24a" stroke-width="1"/>
        <text x="180" y="80" text-anchor="middle" fill="#d8a24a" font-weight="500">AES-256</text>
        <text x="180" y="92" text-anchor="middle" fill="#a8a8a3" font-size="8">envelope</text>
        <!-- model -->
        <rect x="260" y="60" width="80" height="40" rx="3" fill="none" stroke="#3a4049" stroke-width="1"/>
        <text x="300" y="84" text-anchor="middle" fill="#a8a8a3">model</text>
        <!-- arrows -->
        <path d="M 100 80 L 138 80" stroke="#3a4049" stroke-width="1" marker-end="url(#arr)"/>
        <path d="M 220 80 L 258 80" stroke="#3a4049" stroke-width="1" marker-end="url(#arr)"/>
        <!-- destination log -->
        <text x="20" y="130" font-size="8" fill="#6b6b66">destinations</text>
        <g font-size="9">
          <rect x="20" y="138" width="6" height="6" rx="1" fill="#5fa37a"/>
          <text x="32" y="145" fill="#e7e7e3">api.internal/v1</text>
          <text x="280" y="145" fill="#6b6b66">14</text>

          <rect x="20" y="152" width="6" height="6" rx="1" fill="#5fa37a"/>
          <text x="32" y="159" fill="#e7e7e3">model-01.intellirity.io</text>
          <text x="280" y="159" fill="#6b6b66">9</text>
        </g>
      </g>
      <!-- header -->
      <text x="20" y="22" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">payload</text>
      <text x="320" y="22" font-family="Inter Tight" font-size="13" font-weight="500" fill="#fafaf8">AES</text>
    </svg>`,
    tags: ['Website', 'SDK', 'Chrome Ext']
  },
  {
    title: 'Data Flow Tracker',
    desc: 'Every byte mapped: from browser to vector store to external APIs. Real-time lineage shows where your AI data travels and blocks exfiltration attempts.',
    icon: 'flow',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs><linearGradient id="gf" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/></linearGradient></defs>
      <rect width="360" height="180" fill="url(#gf)" rx="4"/>
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <circle cx="50" cy="70" r="8" fill="#0a0b0d" stroke="#7d8aa0" stroke-width="1.2"/><text x="50" y="74" text-anchor="middle" fill="#7d8aa0" font-size="8">APP</text>
        <circle cx="150" cy="70" r="8" fill="#0a0b0d" stroke="#d8a24a" stroke-width="1.2"/><text x="150" y="74" text-anchor="middle" fill="#d8a24a" font-size="8">GW</text>
        <circle cx="250" cy="70" r="8" fill="#0a0b0d" stroke="#5fa37a" stroke-width="1.2"/><text x="250" y="74" text-anchor="middle" fill="#5fa37a" font-size="8">MODEL</text>
        <circle cx="320" cy="70" r="8" fill="rgba(201,90,79,0.12)" stroke="#c95a4f" stroke-width="1.2"/><text x="320" y="74" text-anchor="middle" fill="#c95a4f" font-size="7">EXT</text>
        <path d="M58 70 L142 70" stroke="#3a4049" stroke-width="1"/><path d="M158 70 L242 70" stroke="#3a4049" stroke-width="1"/><path d="M258 70 L312 70" stroke="#c95a4f" stroke-width="1" stroke-dasharray="3 3"/>
        <text x="20" y="110" fill="#6b6b66">flow</text><text x="20" y="128" fill="#e7e7e3">customer email → model → external</text>
        <rect x="220" y="116" width="60" height="14" rx="2" fill="rgba(201,90,79,0.14)"/><text x="250" y="126" text-anchor="middle" fill="#c95a4f" font-size="8">BLOCKED</text>
        <text x="20" y="152" fill="#6b6b66">lineage</text><text x="20" y="168" fill="#a8a8a3">3 hops · 2 trusted · 1 blocked</text>
      </g>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'AI Model Auditing & Black Box Ledger',
    desc: 'When you build your own AI agent you can lose sight of what it does. An immutable ledger logs every decision, reasoning step, and outcome for full audit.',
    icon: 'ledger',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g6" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g6)" rx="4"/>
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <text x="20" y="22" fill="#6b6b66">tamper-evident · append-only</text>
        <text x="280" y="22" fill="#d8a24a">6 entries</text>
        <!-- rows -->
        <g transform="translate(0, 38)">
          <text x="20" y="14" fill="#6b6b66">0xa91f2c</text>
          <text x="100" y="14" fill="#e7e7e3">agent-billing</text>
          <text x="200" y="14" fill="#a8a8a3">approve_refund</text>
          <text x="316" y="14" fill="#6b6b66">14:22</text>
          <circle cx="338" cy="11" r="2" fill="#5fa37a"/>
        </g>
        <line x1="14" y1="48" x2="346" y2="48" stroke="#1c2026"/>
        <g transform="translate(0, 60)">
          <text x="20" y="14" fill="#6b6b66">0x8b3e1d</text>
          <text x="100" y="14" fill="#e7e7e3">chatbot-cust</text>
          <text x="200" y="14" fill="#a8a8a3">respond_to_user</text>
          <text x="316" y="14" fill="#6b6b66">14:21</text>
          <circle cx="338" cy="11" r="2" fill="#5fa37a"/>
        </g>
        <line x1="14" y1="70" x2="346" y2="70" stroke="#1c2026"/>
        <g transform="translate(0, 82)">
          <text x="20" y="14" fill="#6b6b66">0x6c4a92</text>
          <text x="100" y="14" fill="#e7e7e3">agent-billing</text>
          <text x="200" y="14" fill="#a8a8a3">verify_identity</text>
          <text x="316" y="14" fill="#6b6b66">14:21</text>
          <circle cx="338" cy="11" r="2" fill="#5fa37a"/>
        </g>
        <line x1="14" y1="92" x2="346" y2="92" stroke="#1c2026"/>
        <g transform="translate(0, 104)">
          <text x="20" y="14" fill="#6b6b66">0x1f8d70</text>
          <text x="100" y="14" fill="#e7e7e3">rag-search</text>
          <text x="200" y="14" fill="#a8a8a3">search_knowledge</text>
          <text x="316" y="14" fill="#6b6b66">14:21</text>
          <circle cx="338" cy="11" r="2" fill="#5fa37a"/>
        </g>
        <line x1="14" y1="114" x2="346" y2="114" stroke="#1c2026"/>
        <g transform="translate(0, 126)">
          <text x="20" y="14" fill="#6b6b66">0xe2b54a</text>
          <text x="100" y="14" fill="#e7e7e3">agent-billing</text>
          <text x="200" y="14" fill="#a8a8a3">block_tx</text>
          <text x="316" y="14" fill="#6b6b66">14:20</text>
          <circle cx="338" cy="11" r="2" fill="#5fa37a"/>
        </g>
      </g>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'Verifiable Proof of Intent (VPI)',
    desc: 'A tamper-resistant certificate linking a real human to a specific set of AI instructions. When AI acts on your behalf, VPI records who authorized what, when, and within scope.',
    icon: 'seal',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g7" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g7)" rx="4"/>
      <!-- certificate card -->
      <rect x="40" y="30" width="240" height="120" rx="3" fill="none" stroke="#3a4049" stroke-width="1"/>
      <line x1="40" y1="46" x2="280" y2="46" stroke="#1c2026"/>
      <text x="50" y="41" font-family="JetBrains Mono, monospace" font-size="8" fill="#d8a24a">VPI-7F2A · ACTIVE</text>
      <text x="50" y="64" font-family="Inter Tight" font-size="13" font-weight="500" fill="#fafaf8">Marketing copy</text>
      <text x="50" y="80" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">scope: gpt-prod-01 · web</text>
      <!-- issuer -->
      <line x1="50" y1="100" x2="270" y2="100" stroke="#1c2026"/>
      <text x="50" y="118" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">issued by</text>
      <text x="50" y="132" font-family="Inter Tight" font-size="11" fill="#e7e7e3">maya@northwind.io</text>
      <text x="220" y="132" font-family="JetBrains Mono, monospace" font-size="9" fill="#a8a8a3">2h ago</text>
      <!-- seal -->
      <circle cx="252" cy="60" r="14" fill="none" stroke="#d8a24a" stroke-width="1.2"/>
      <g stroke="#d8a24a" stroke-width="1">
        <line x1="252" y1="60" x2="252" y2="48"/>
        <line x1="252" y1="60" x2="262" y2="55"/>
        <line x1="252" y1="60" x2="262" y2="65"/>
        <line x1="252" y1="60" x2="242" y2="55"/>
        <line x1="252" y1="60" x2="242" y2="65"/>
      </g>
      <text x="320" y="100" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">scope verified</text>
      <path d="M 318 105 L 322 109 L 330 102" fill="none" stroke="#5fa37a" stroke-width="1.4" stroke-linecap="round"/>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'Autonomous Escrow',
    desc: 'A payment buffer that holds funds until a trusted oracle confirms the work is done. Agents can spend safely, because money is released only once verified.',
    icon: 'escrow',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g8" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g8)" rx="4"/>
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <text x="20" y="22" fill="#6b6b66">ESCROW  0x4f…a82</text>
        <text x="320" y="22" text-anchor="end" fill="#d8a24a">active</text>
        <!-- big amount -->
        <text x="20" y="60" font-family="Inter Tight" font-size="28" font-weight="500" fill="#fafaf8">₹1,24,500</text>
        <text x="180" y="60" font-size="10" fill="#6b6b66">8 escrows</text>
        <!-- oracle progress -->
        <text x="20" y="92" fill="#6b6b66">oracle verification</text>
        <rect x="20" y="100" width="320" height="3" rx="1.5" fill="#1c2026"/>
        <rect x="20" y="100" width="210" height="3" rx="1.5" fill="#d8a24a"/>
        <text x="20" y="120" fill="#e7e7e3">65%</text>
        <text x="60" y="120" fill="#6b6b66">awaiting</text>
        <text x="320" y="120" text-anchor="end" fill="#a8a8a3">~ 4 min</text>
        <!-- bottom row -->
        <line x1="20" y1="138" x2="340" y2="138" stroke="#1c2026"/>
        <g font-size="8" fill="#6b6b66">
          <text x="20" y="158">released · 30d</text>
          <text x="320" y="158" text-anchor="end" fill="#e7e7e3">₹8,42,300</text>
        </g>
      </g>
    </svg>`,
    tags: ['Website', 'SDK']
  },
  {
    title: 'Workflow & Automation Anomaly Detection',
    desc: 'Surfaces hidden workflows, automation chains, and unauthorized action sequences in real time, catching infinite loops, runaway spending, and cascading failures early.',
    icon: 'flow',
    visual: `<svg viewBox="0 0 360 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="g9" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#1a1d22"/><stop offset="1" stop-color="#0d0f12"/>
        </linearGradient>
      </defs>
      <rect width="360" height="180" fill="url(#g9)" rx="4"/>
      <g font-family="JetBrains Mono, monospace" font-size="9">
        <!-- nodes -->
        <circle cx="40" cy="50" r="6" fill="#0a0b0d" stroke="#d8a24a" stroke-width="1.2"/>
        <text x="40" y="74" text-anchor="middle" fill="#a8a8a3">trigger</text>

        <circle cx="130" cy="50" r="6" fill="#0a0b0d" stroke="#d8a24a" stroke-width="1.2"/>
        <text x="130" y="74" text-anchor="middle" fill="#a8a8a3">action</text>

        <circle cx="220" cy="50" r="9" fill="rgba(201,90,79,0.1)" stroke="#c95a4f" stroke-width="1.5"/>
        <text x="220" y="74" text-anchor="middle" fill="#c95a4f">loop</text>

        <circle cx="310" cy="50" r="6" fill="#0a0b0d" stroke="#5fa37a" stroke-width="1.2"/>
        <text x="310" y="74" text-anchor="middle" fill="#a8a8a3">stop</text>

        <!-- arrows -->
        <path d="M 47 50 L 122 50" stroke="#3a4049"/>
        <path d="M 137 50 L 209 50" stroke="#3a4049"/>
        <path d="M 229 50 L 302 50" stroke="#3a4049"/>
        <!-- loop arrow on loop node -->
        <path d="M 220 41 A 9 9 0 0 1 229 50" fill="none" stroke="#c95a4f" stroke-width="1.2" stroke-linecap="round"/>
        <path d="M 226 47 L 229 50 L 226 53" fill="none" stroke="#c95a4f" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        <!-- bottom findings -->
        <line x1="20" y1="100" x2="340" y2="100" stroke="#1c2026"/>
        <text x="20" y="120" fill="#6b6b66">anomaly</text>
        <text x="20" y="138" fill="#e7e7e3">Runaway spend signature</text>
        <rect x="220" y="126" width="50" height="14" rx="2" fill="rgba(201,90,79,0.14)"/>
        <text x="245" y="136" text-anchor="middle" fill="#c95a4f" font-size="9">HIGH</text>
        <text x="20" y="158" fill="#e7e7e3">3 cascading effects</text>
        <rect x="220" y="146" width="50" height="14" rx="2" fill="rgba(200,154,74,0.14)"/>
        <text x="245" y="156" text-anchor="middle" fill="#c89a4a" font-size="9">MED</text>
      </g>
    </svg>`,
    tags: ['Website', 'SDK']
  }
];

const ICONS = {
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M12 2.5 L20 5 V12 C20 16.5 16.8 20 12 21.5 C7.2 20 4 16.5 4 12 V5 Z"/><path d="M8.5 12 L11 14.5 L15.5 9.5"/></svg>',
  pulse:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M2 12 H6 L9 4 L15 20 L18 12 H22"/></svg>',
  gavel:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 4 H19 V8 H5 Z"/><path d="M5 11 H19 V14 H5 Z"/><path d="M5 17 H14 V20 H5 Z"/></svg>',
  code:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M8 7 L3.5 12 L8 17"/><path d="M16 7 L20.5 12 L16 17"/><path d="M14 5 L10 19"/></svg>',
  lock:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><rect x="4" y="10" width="16" height="11" rx="1.5"/><path d="M7 10 V7 C7 4.2 9.2 2 12 2 C14.8 2 17 4.2 17 7 V10"/><circle cx="12" cy="15" r="1" fill="currentColor"/></svg>',
  ledger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M5 3 H15 L19 7 V21 H5 Z"/><path d="M15 3 V7 H19"/><path d="M8 11 H16 M8 14.5 H16 M8 18 H13"/></svg>',
  seal:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="9" r="4"/><path d="M8 12.5 L7 21 L12 18 L17 21 L16 12.5"/></svg>',
  escrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="12" cy="12" r="8.5"/><path d="M12 6.5 V17.5 M7.5 9 H16.5 M7.5 15 H16.5"/></svg>',
  flow:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><circle cx="4" cy="4" r="1.8"/><circle cx="20" cy="4" r="1.8"/><circle cx="4" cy="20" r="1.8"/><circle cx="20" cy="20" r="1.8"/><path d="M5.5 4 H18.5 M4 5.5 V18.5 M20 5.5 V18.5 M5.5 20 H18.5"/></svg>'
};

export function initPlatform() {
  const track = document.getElementById('platformTrack');
  const pin = document.getElementById('platformPin');
  const progress = document.getElementById('platformProgress');
  if (!track || !pin) return;

  const pageMap = ['feature-jailbreak','feature-monitor','feature-policy','feature-vibe','feature-leakage','feature-flow','feature-audit','feature-vpi','feature-escrow','feature-anomaly'];
  capabilities.forEach((c, i) => {
    const card = document.createElement('article');
    card.className = 'cap';
    card.innerHTML = `
      <div class="cap__head">
        <div class="cap__num">MODULE <b>${String(i + 1).padStart(2, '0')}</b> / ${String(capabilities.length).padStart(2, '0')}</div>
        <div class="cap__icon">${ICONS[c.icon] || ''}</div>
      </div>
      <h3 class="cap__title">${c.title}</h3>
      <p class="cap__desc">${c.desc}</p>
      <div class="cap__visual">${c.visual}</div>
      <div class="cap__foot">
        <div class="cap__tags">${c.tags.map(t => `<span class="cap__tag">${t}</span>`).join('')}</div>
        <span class="cap__cta" data-open-app data-page="${pageMap[i]||'overview'}">Open module →</span>
      </div>
    `;
    track.appendChild(card);
    const cta = card.querySelector('.cap__cta');
    if(cta){ cta.style.cursor='pointer'; cta.setAttribute('role','button'); }
    // make the whole card clickable (delegated) so users don't have to hit the small label
    card.style.cursor='pointer';
    card.dataset.page = pageMap[i] || 'overview';
    card.addEventListener('click', (e)=>{
      // ignore clicks on inner anchor-like elements (none currently, but safe)
      if(e.target.closest('a, button, input, select, textarea')) return;
      window.dispatchEvent(new CustomEvent('intellirity:open-app', {detail:{page: card.dataset.page}}));
    });

    // No 3D tilt. Per micro-interaction skill: "delete more than you add."
    // Tilt on hover reads as demo-y. The card lights up via border + bg
    // color shift, which is calm and product-like.
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  const gs = window.gsap;
  const cards = track.querySelectorAll('.cap');
  const totalScroll = () => track.scrollWidth - innerWidth + parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--pad-x')) * 2;

  gs.to(track, {
    x: () => -totalScroll(),
    ease: 'none',
    scrollTrigger: {
      trigger: pin,
      start: 'top top',
      end: () => `+=${totalScroll()}`,
      pin: true,
      scrub: 0.85,
      invalidateOnRefresh: true,
      onUpdate: (self) => { progress.style.width = (self.progress * 100) + '%'; }
    }
  });

  // Cards enter: restrained, compositor-only (opacity + y)
  ScrollTrigger.create({
    trigger: pin,
    start: 'top 78%',
    once: true,
    onEnter: () => {
      gs.from(cards, {
        opacity: 0, y: 14, scale: 0.985,
        duration: 0.65, ease: 'expo.out', stagger: 0.04
      });
    }
  });
}



