/* =========================================================
   how-stage.js: three real SVG illustrations
   One per step. No canvas, no continuous animation.
   Smooth swap on scroll, no bouncing.
   ========================================================= */

const STEPS = {
  1: `<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="h1g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16191e"/><stop offset="1" stop-color="#0a0b0d"/>
      </linearGradient>
    </defs>
    <rect width="480" height="360" fill="url(#h1g)"/>
    <!-- grid -->
    <g stroke="#1c2026" stroke-width="0.5">
      <line x1="0" y1="60" x2="480" y2="60"/><line x1="0" y1="120" x2="480" y2="120"/>
      <line x1="0" y1="180" x2="480" y2="180"/><line x1="0" y1="240" x2="480" y2="240"/>
      <line x1="0" y1="300" x2="480" y2="300"/>
      <line x1="80" y1="0" x2="80" y2="360"/><line x1="160" y1="0" x2="160" y2="360"/>
      <line x1="240" y1="0" x2="240" y2="360"/><line x1="320" y1="0" x2="320" y2="360"/>
      <line x1="400" y1="0" x2="400" y2="360"/>
    </g>
    <!-- existing endpoint box -->
    <rect x="60" y="120" width="160" height="100" rx="6" fill="none" stroke="#3a4049" stroke-width="1"/>
    <text x="140" y="98" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66" letter-spacing="0.08em">YOUR MODEL</text>
    <text x="140" y="160" text-anchor="middle" font-family="Inter Tight" font-size="11" fill="#e7e7e3">gpt-prod-01</text>
    <text x="140" y="178" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8" fill="#6b6b66">api.example.com/v1</text>
    <!-- arrow to intellirity -->
    <line x1="220" y1="170" x2="266" y2="170" stroke="#7d8aa0" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M 260 166 L 266 170 L 260 174" fill="none" stroke="#7d8aa0" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- intellirity proxy (the new layer) -->
    <rect x="266" y="120" width="160" height="100" rx="6" fill="rgba(216,162,74,0.06)" stroke="#d8a24a" stroke-width="1.4"/>
    <text x="346" y="98" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#d8a24a" letter-spacing="0.08em">+ INTELLIRITY</text>
    <text x="346" y="160" text-anchor="middle" font-family="Inter Tight" font-size="11" fill="#fafaf8">observes</text>
    <text x="346" y="178" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="8" fill="#a8a8a3">every request</text>
    <!-- bottom label -->
    <text x="240" y="290" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66" letter-spacing="0.08em">no code changes</text>
    <line x1="180" y1="298" x2="300" y2="298" stroke="#3a4049" stroke-width="0.5"/>
    <text x="240" y="316" text-anchor="middle" font-family="Inter Tight" font-size="11" fill="#a8a8a3">sits in front · watches everything</text>
  </svg>`,

  2: `<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="h2g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16191e"/><stop offset="1" stop-color="#0a0b0d"/>
      </linearGradient>
    </defs>
    <rect width="480" height="360" fill="url(#h2g)"/>
    <g stroke="#1c2026" stroke-width="0.5">
      <line x1="0" y1="60" x2="480" y2="60"/><line x1="0" y1="300" x2="480" y2="300"/>
      <line x1="80" y1="0" x2="80" y2="360"/><line x1="400" y1="0" x2="400" y2="360"/>
    </g>
    <!-- input prompt (attacker) -->
    <rect x="40" y="50" width="240" height="44" rx="4" fill="rgba(201,90,79,0.06)" stroke="#c95a4f" stroke-width="1"/>
    <text x="160" y="76" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="10" fill="#c95a4f">"ignore previous instructions"</text>
    <!-- arrow into shield -->
    <line x1="280" y1="72" x2="316" y2="72" stroke="#3a4049" stroke-width="1"/>
    <!-- shield symbol -->
    <g transform="translate(360 72)">
      <path d="M 0 -22 L 18 -14 V 4 C 18 16 12 22 0 26 C -12 22 -18 16 -18 4 V -14 Z"
            fill="rgba(216,162,74,0.10)" stroke="#d8a24a" stroke-width="1.4" stroke-linejoin="round"/>
      <path d="M -7 0 L -2 5 L 8 -7" fill="none" stroke="#d8a24a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    </g>
    <!-- blocked output -->
    <rect x="40" y="140" width="240" height="32" rx="4" fill="none" stroke="#3a4049" stroke-width="1" stroke-dasharray="3 3"/>
    <text x="160" y="161" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66">request blocked · 1004</text>
    <!-- bottom: rule list -->
    <text x="40" y="220" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66" letter-spacing="0.08em">YOUR BOUNDARIES</text>
    <g font-family="JetBrains Mono, monospace" font-size="10">
      <g transform="translate(40, 244)">
        <rect width="12" height="12" rx="2" fill="#d8a24a"/>
        <path d="M 3 6 L 6 9 L 10 4" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="22" y="10" fill="#e7e7e3">no_pii</text>
        <text x="380" y="10" fill="#6b6b66">block</text>
      </g>
      <g transform="translate(40, 266)">
        <rect width="12" height="12" rx="2" fill="#d8a24a"/>
        <path d="M 3 6 L 6 9 L 10 4" fill="none" stroke="#0a0b0d" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <text x="22" y="10" fill="#e7e7e3">no_prompt_leak</text>
        <text x="380" y="10" fill="#6b6b66">block</text>
      </g>
      <g transform="translate(40, 288)">
        <rect width="12" height="12" rx="2" fill="rgba(255,255,255,0.08)" stroke="#3a4049"/>
        <text x="22" y="10" fill="#6b6b66">no_competitor_mention</text>
        <text x="380" y="10" fill="#6b6b66">off</text>
      </g>
    </g>
  </svg>`,

  3: `<svg viewBox="0 0 480 360" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="h3g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#16191e"/><stop offset="1" stop-color="#0a0b0d"/>
      </linearGradient>
    </defs>
    <rect width="480" height="360" fill="url(#h3g)"/>
    <g stroke="#1c2026" stroke-width="0.5">
      <line x1="0" y1="60" x2="480" y2="60"/>
      <line x1="0" y1="180" x2="480" y2="180"/>
      <line x1="0" y1="300" x2="480" y2="300"/>
    </g>
    <!-- live stream of events -->
    <text x="24" y="36" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66" letter-spacing="0.08em">LIVE EVENT FEED</text>
    <text x="456" y="36" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9" fill="#d8a24a">● live</text>
    <g font-family="JetBrains Mono, monospace" font-size="9.5">
      <g transform="translate(24, 76)">
        <text x="0" y="12" fill="#6b6b66">14:22:08</text>
        <rect x="72" y="3" width="32" height="14" rx="2" fill="rgba(95,163,122,0.14)"/>
        <text x="79" y="13" fill="#5fa37a" font-size="8" letter-spacing="0.06em">SAFE</text>
        <text x="116" y="12" fill="#e7e7e3">return_policy()</text>
        <text x="416" y="12" fill="#6b6b66" text-anchor="end">4 ms</text>
      </g>
      <g transform="translate(24, 100)">
        <text x="0" y="12" fill="#6b6b66">14:22:09</text>
        <rect x="72" y="3" width="32" height="14" rx="2" fill="rgba(95,163,122,0.14)"/>
        <text x="79" y="13" fill="#5fa37a" font-size="8" letter-spacing="0.06em">SAFE</text>
        <text x="116" y="12" fill="#e7e7e3">search_kb("refund")</text>
        <text x="416" y="12" fill="#6b6b66" text-anchor="end">12 ms</text>
      </g>
      <g transform="translate(24, 124)">
        <text x="0" y="12" fill="#6b6b66">14:22:10</text>
        <rect x="72" y="3" width="44" height="14" rx="2" fill="rgba(201,90,79,0.14)"/>
        <text x="78" y="13" fill="#c95a4f" font-size="8" letter-spacing="0.06em">BLOCK</text>
        <text x="128" y="12" fill="#e7e7e3">exfil_keys()</text>
        <text x="416" y="12" fill="#c95a4f" text-anchor="end">2 ms</text>
      </g>
      <g transform="translate(24, 148)">
        <text x="0" y="12" fill="#6b6b66">14:22:11</text>
        <rect x="72" y="3" width="32" height="14" rx="2" fill="rgba(95,163,122,0.14)"/>
        <text x="79" y="13" fill="#5fa37a" font-size="8" letter-spacing="0.06em">SAFE</text>
        <text x="116" y="12" fill="#e7e7e3">answer_user()</text>
        <text x="416" y="12" fill="#6b6b66" text-anchor="end">3 ms</text>
      </g>
    </g>
    <!-- summary stats -->
    <line x1="24" y1="200" x2="456" y2="200" stroke="#1c2026"/>
    <g transform="translate(24, 220)">
      <text font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66" letter-spacing="0.08em">LAST 1H</text>
    </g>
    <g transform="translate(24, 252)">
      <text font-family="Inter Tight" font-size="22" font-weight="500" fill="#fafaf8">2,184</text>
      <text x="0" y="20" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66">events scored</text>
    </g>
    <g transform="translate(180, 252)">
      <text font-family="Inter Tight" font-size="22" font-weight="500" fill="#5fa37a">1,842</text>
      <text x="0" y="20" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66">safe</text>
    </g>
    <g transform="translate(290, 252)">
      <text font-family="Inter Tight" font-size="22" font-weight="500" fill="#c89a4a">312</text>
      <text x="0" y="20" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66">flagged</text>
    </g>
    <g transform="translate(390, 252)">
      <text font-family="Inter Tight" font-size="22" font-weight="500" fill="#c95a4f">30</text>
      <text x="0" y="20" font-family="JetBrains Mono, monospace" font-size="9" fill="#6b6b66">blocked</text>
    </g>
  </svg>`
};

export function initHowStage(canvas) {
  if (!canvas) return;
  // hide canvas: render SVG into the parent
  canvas.style.display = 'none';
  const parent = canvas.parentElement;
  const wrap = document.createElement('div');
  wrap.className = 'how__illust';
  wrap.style.transition = 'opacity 220ms var(--ease), transform 220ms var(--ease)';
  wrap.innerHTML = STEPS[1];
  parent.appendChild(wrap);

  // Observe which step the user is reading
  const steps = Array.from(document.querySelectorAll('.how__step'));

  // Cross-fade with scale: old content fades down, new content
  // scales up. The 240ms scale-up feels more deliberate than a flat
  // opacity transition. No "flash" because we wait for the old
  // content to be fully gone before swapping.
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const idx = Number(e.target.dataset.step);
        const label = document.getElementById('howStepLabel');
        if (label) label.textContent = `STEP 0${idx} / 03`;
        // Fade old out: subtle, no scale jump
        wrap.style.opacity = '0';
        wrap.style.transform = 'translateY(4px)';
        setTimeout(() => {
          wrap.innerHTML = STEPS[idx];
          requestAnimationFrame(() => {
            wrap.style.opacity = '1';
            wrap.style.transform = 'translateY(0)';
          });
        }, 140);
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px' });
  steps.forEach(s => io.observe(s));
}