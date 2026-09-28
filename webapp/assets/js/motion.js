/* =========================================================
   motion.js: stagger reveals + nav pill + card tilt +
   success particle bursts.
   Grids fade their children in sequence when scrolled into
   view; the nav pill glides under the active link; cards get
   a subtle 3D tilt on fine pointers; success actions burst
   particles Kokonut-style. All motion is transform/opacity
   only and fully inert under prefers-reduced-motion.
   ========================================================= */
export function initMotion() {
  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia &&
    window.matchMedia('(pointer: fine)').matches;

  // ---------- Stagger grids ----------
  const grids = Array.from(document.querySelectorAll(
    '.pricing__grid, .trust__list, .metrics, .footer__top, .plans'
  ));
  grids.forEach(function (g) { g.classList.add('mx-stagger'); });
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('mx-in');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    grids.forEach(function (g) { io.observe(g); });
  } else {
    grids.forEach(function (g) { g.classList.add('mx-in'); });
  }

  // ---------- Nav active pill ----------
  try {
    const center = document.querySelector('.nav__center');
    if (!center) return;
    const pill = document.createElement('span');
    pill.className = 'nav__pill';
    pill.setAttribute('aria-hidden', 'true');
    center.appendChild(pill);

    const move = function () {
      const active = center.querySelector('.nav__link.is-active');
      if (!active) { pill.classList.remove('is-on'); return; }
      const c = center.getBoundingClientRect();
      const r = active.getBoundingClientRect();
      pill.style.left = (r.left - c.left + 10) + 'px';
      pill.style.width = Math.max(0, r.width - 20) + 'px';
      pill.classList.add('is-on');
    };
    const place = function () {
      if (reduce) {
        const active = center.querySelector('.nav__link.is-active');
        pill.style.transition = 'none';
        if (active) {
          const c = center.getBoundingClientRect();
          const r = active.getBoundingClientRect();
          pill.style.left = (r.left - c.left + 10) + 'px';
          pill.style.width = Math.max(0, r.width - 20) + 'px';
          pill.classList.add('is-on');
        }
        return;
      }
      requestAnimationFrame(move);
    };
    new MutationObserver(place).observe(center, {
      attributes: true, subtree: true, attributeFilter: ['class']
    });
    window.addEventListener('resize', place);
    place();
  } catch (e) { /* nav works without the pill */ }

  // ---------- 3D card tilt (fine pointers only) ----------
  try {
    if (!reduce && finePointer) {
      let current = null;
      const MAX = 4;
      document.addEventListener('pointermove', function (e) {
        const card = e.target && e.target.closest
          ? e.target.closest('.plan, .cap, .stat, .panel.gauge-panel')
          : null;
        if (card !== current) {
          if (current) current.style.transform = '';
          current = card;
        }
        if (!current) return;
        const r = current.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        current.style.transform =
          'perspective(900px) rotateX(' + (-py * MAX).toFixed(2) + 'deg)' +
          ' rotateY(' + (px * MAX).toFixed(2) + 'deg)';
      }, { passive: true });
      document.addEventListener('pointerleave', function () {
        if (current) { current.style.transform = ''; current = null; }
      });
      document.addEventListener('scroll', function () {
        if (current) { current.style.transform = ''; current = null; }
      }, { passive: true, capture: true });
    }
  } catch (e) { /* cards work without tilt */ }

  // ---------- Success particle bursts (delegated) ----------
  function burst(el) {
    if (!window.anime || reduce) return;
    try {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      for (let i = 0; i < 8; i++) {
        const d = document.createElement('span');
        d.className = 'mx-particle' + (i % 4 === 0 ? ' is-ok' : '');
        d.style.left = cx + 'px';
        d.style.top = cy + 'px';
        document.body.appendChild(d);
        const ang = (i / 8) * Math.PI * 2 + Math.random() * 0.5;
        const dist = 26 + Math.random() * 44;
        window.anime({
          targets: d,
          translateX: [0, Math.cos(ang) * dist],
          translateY: [0, Math.sin(ang) * dist - 14],
          scale: [0, 1, 0],
          opacity: [1, 1, 0],
          easing: 'easeOutExpo',
          duration: 650,
          delay: i * 40,
          complete: function () { d.remove(); }
        });
      }
    } catch (e) { /* feedback is optional */ }
  }
  document.addEventListener('click', function (e) {
    const b = e.target && e.target.closest ? e.target.closest('[data-burst]') : null;
    if (!b) return;
    setTimeout(function () { burst(b); }, 60);
  });

  // ---------- Live threat ticker (real engine feed) ----------
  (function initTicker() {
    const box = document.getElementById('threatTicker');
    const track = document.getElementById('tickerTrack');
    if (!box || !track) return;
    const esc = function (s) {
      return String(s).replace(/[&<>"']/g, function (ch) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
      });
    };
    fetch('/api/v1/threats').then(function (r) {
      if (!r.ok) throw new Error('feed');
      return r.json();
    }).then(function (list) {
      if (!Array.isArray(list) || !list.length) return;
      const half = list.slice(0, 10).map(function (e) {
        const sev = String(e.severity || 'low').toLowerCase();
        const tag = sev === 'high' ? 'BLOCKED' : sev === 'medium' ? 'FLAGGED' : 'SAFE';
        const col = sev === 'high' ? '#c95a4f' : sev === 'medium' ? '#c89a4a' : '#5fa37a';
        return '<span class="ticker__item"><b style="color:' + col + '">' + tag + '</b>' +
          '<span>' + esc(e.threat_type || 'Event') + '</span>' +
          '<span class="ticker__sep">//</span><span>' + esc(e.source || '') + '</span></span>';
      }).join('<span class="ticker__gap">//</span>');
      track.innerHTML = half + '<span class="ticker__gap">//</span>' + half + '<span class="ticker__gap">//</span>';
      box.hidden = false;
    }).catch(function () { /* ticker stays hidden offline: no fake feed */ });
  })();

  // ---------- Cursor spotlight for cards and panels ----------
  try {
    if (!reduce && finePointer) {
      document.addEventListener('pointermove', function (e) {
        const card = e.target && e.target.closest
          ? e.target.closest('.cap,.plan,.stat,.panel,.terminal,.dashboard-card')
          : null;
        if (!card) return;
        if (!card.classList.contains('spot')) card.classList.add('spot');
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
        card.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
      }, { passive: true });
    }
  } catch (e) { /* spotlight is optional */ }

  // ---------- Scroll progress bar ----------
  try {
    const bar = document.createElement('div');
    bar.id = 'mx-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);
    let queued = false;
    const update = function () {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? (h.scrollTop / max).toFixed(4) : 0) + ')';
      queued = false;
    };
    document.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  } catch (e) { /* progress bar is optional */ }
}
