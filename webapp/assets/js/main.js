/* =========================================================
   main.js: orchestrator (no custom cursor, no particle spam)
   ========================================================= */

import { initField } from './bg-field.js?v=12';
import { initBg3D } from './bg-3d.js?v=12';
import { initHeroStage } from './hero-stage.js?v=12';
import { initPlatform } from './platform.js?v=12';
import { initHowStage } from './how-stage.js?v=12';
import { initScanner } from './scanner.js?v=12';
import { initPricing } from './pricing.js?v=12';
import { initModals } from './modals.js?v=12';
import { initDashboard } from './dashboard.js?v=12';
import { initMotion } from './motion.js?v=12';
import { initLiquidCta } from './liquid-cta.js?v=12';

// Live reduced-motion gate. The OS setting can be toggled without a
// reload, so we listen for changes and re-evaluate. (per the
// accessible-animation skill: "Toggling the OS setting fires no
// page reload; without a change listener the page keeps its stale state.")
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const $  = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => Array.from(r.querySelectorAll(s));

window.addEventListener('DOMContentLoaded', () => {

  // ---------- Curtain: quicker, calmer ----------
  const curtain = $('#curtain');
  if (curtain) setTimeout(() => curtain.classList.add('is-done'), 540);

  // ---------- Backgrounds: 3D constellation field, 2D fallback ----------
  try {
    if (!initBg3D($('#bgField'))) initField($('#bgField'));
  } catch (e) {
    try { initField($('#bgField')); } catch (e2) { console.warn('bg', e2); }
  }

  // ---------- Nav scroll state ----------
  const nav = $('#nav');
  addEventListener('scroll', () => {
    nav.classList.toggle('is-scrolled', scrollY > 8);
  }, { passive: true });

  // ---------- Mobile menu ----------
  const burger = $('#navBurger');
  const mobileMenu = $('#mobileMenu');
  burger?.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') === 'true';
    burger.setAttribute('aria-expanded', String(!open));
    mobileMenu.classList.toggle('is-open', !open);
    mobileMenu.setAttribute('aria-hidden', String(open));
    document.body.style.overflow = open ? '' : 'hidden';
  });
  mobileMenu?.querySelectorAll('a, button').forEach(a => a.addEventListener('click', () => {
    burger.setAttribute('aria-expanded', 'false');
    mobileMenu.classList.remove('is-open');
    document.body.style.overflow = '';
  }));

  // ---------- Hero HUD live values (measured from the real engine) ----------
  const hudLatency = $('#hudLatency');
  const hudThreats = $('#hudThreats');
  async function refreshHud(){
    const t0 = performance.now();
    try{
      const s = await (await fetch('/api/v1/system/summary')).json();
      const ms = Math.max(1, Math.round(performance.now() - t0));
      if (hudLatency) hudLatency.textContent = ms + 'ms';
      if (hudThreats) hudThreats.textContent = Number(s.threats_active ?? 0).toLocaleString();
    }catch(e){ /* keep last values when offline */ }
  }
  refreshHud();
  setInterval(refreshHud, 8000);

  // ---------- Metrics band (live engine numbers with restrained count-up) ----------
  function countUp(el, target){
    if(!el) return;
    target = Number(target) || 0;
    const dur = 900; const t0 = performance.now();
    function step(t){
      const p = Math.min((t - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.firstChild.nodeValue = String(Math.round(target * e));
      if(p < 1) requestAnimationFrame(step);
      else el.firstChild.nodeValue = String(Math.round(target));
    }
    requestAnimationFrame(step);
  }
  async function refreshMetrics(){
    try{
      const s = await (await fetch('/api/v1/system/summary')).json();
      countUp(document.getElementById('mBlocked'), s.threats_blocked);
      countUp(document.getElementById('mScans'), s.total_scans);
      countUp(document.getElementById('mModels'), s.models_monitored);
      countUp(document.getElementById('mScore'), Math.round(Number(s.security_score ?? 0)));
    }catch(e){}
  }
  const metricsSec = document.getElementById('metrics');
  if(metricsSec){
    let metricsDone = false;
    new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if(e.isIntersecting && !metricsDone){ metricsDone = true; refreshMetrics(); obs.disconnect(); }
      });
    }, { threshold: 0.3 }).observe(metricsSec);
    setInterval(refreshMetrics, 30000);
  }

  // ---------- Reveal on scroll (gentle) ----------
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  $$('.reveal, .reveal-mask, [data-reveal]').forEach(el => io.observe(el));

  // ---------- GSAP: headline only, restrained ----------
  if (window.gsap && window.ScrollTrigger) {
    gsap.registerPlugin(ScrollTrigger);
    gsap.from('.hero__title .row > span', {
      yPercent: 110, duration: 0.85, ease: 'expo.out', stagger: 0.045, delay: 0.2
    });
  }

  // ---------- Kinetic headline: characters cascade in ----------
  try {
    if (window.anime && window.gsap && !prefersReducedMotion()) {
      const splitChars = function (el) {
        const out = [];
        Array.from(el.childNodes).forEach(function (node) {
          if (node.nodeType === 3) {
            const frag = document.createDocumentFragment();
            Array.from(node.textContent).forEach(function (ch) {
              const s = document.createElement('span');
              s.className = 'mx-ch';
              s.textContent = ch;
              frag.appendChild(s);
              out.push(s);
            });
            el.replaceChild(frag, node);
          } else if (node.nodeType === 1) {
            Array.prototype.push.apply(out, splitChars(node));
          }
        });
        return out;
      };
      let chars = [];
      document.querySelectorAll('.hero__title .row > span').forEach(function (row) {
        chars = chars.concat(splitChars(row));
      });
      chars.forEach(function (ch) { ch.style.opacity = '0'; });
      window.anime({
        targets: chars,
        opacity: [0, 1],
        translateY: [12, 0],
        easing: 'easeOutExpo',
        duration: 550,
        delay: window.anime.stagger(16, { start: 550 }),
        complete: function () {
          chars.forEach(function (ch) { ch.style.opacity = ''; ch.style.transform = ''; });
        }
      });
    }
  } catch (e) { /* headline keeps its GSAP reveal */ }


  // ---------- Hero entrance (anime.js timeline, GPU-only) ----------
  try {
    if (window.anime && !prefersReducedMotion()) {
      window.anime.timeline({ easing: 'easeOutExpo', duration: 800 })
        .add({ targets: '.hero__kicker', opacity: [0, 1], translateY: [12, 0] }, 150)
        .add({ targets: '.hero__lede', opacity: [0, 1], translateY: [14, 0] }, '-=650')
        .add({ targets: '.hero__cta', opacity: [0, 1], translateY: [14, 0] }, '-=650')
        .add({ targets: '.hero__stage', opacity: [0, 1], translateY: [18, 0] }, '-=700');
    }
  } catch (e) { console.warn('hero entrance', e); }

  // ---------- Init sections ----------
  initHeroStage($('#heroShield'));
  initPlatform();
  initHowStage($('#howCanvas'));
  initScanner();
  initPricing();
  initModals();
  initDashboard();
  initMotion();
  initLiquidCta();

  // ---------- Hero word morph (text-morph, native) ----------
  // Rotates the emphasized word through real threat nouns on a slow
  // timer. Skipped under reduced motion; pauses offscreen.
  try {
    const em = document.querySelector('.hero__title em');
    if (em && !prefersReducedMotion()) {
      const words = ['threats', 'attacks', 'risks'];
      let wi = 0;
      let visible = true;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          visible = entries[0].isIntersecting;
        }).observe(em);
      }
      setInterval(function () {
        if (!visible || document.hidden || prefersReducedMotion()) return;
        wi = (wi + 1) % words.length;
        const span = document.createElement('span');
        span.className = 'mx-word is-out';
        span.textContent = em.textContent;
        em.textContent = '';
        em.appendChild(span);
        setTimeout(function () {
          span.textContent = words[wi];
          span.classList.remove('is-out');
          span.classList.add('is-in');
          setTimeout(function () {
            // Flatten back to plain text so the DOM never nests spans.
            em.textContent = words[wi];
          }, 450);
        }, 270);
      }, 3400);
    }
  } catch (e) { /* headline stays static */ }

  // ---------- Press ripple on CTAs (delegated, tactile feedback) ----------
  document.addEventListener('pointerdown', function (e) {
    if (prefersReducedMotion()) return;
    const b = e.target && e.target.closest ? e.target.closest('.btn') : null;
    if (!b) return;
    try {
      const r = b.getBoundingClientRect();
      const d = Math.max(r.width, r.height) * 2.1;
      const s = document.createElement('span');
      s.className = 'mx-ripple';
      s.style.width = d + 'px';
      s.style.height = d + 'px';
      s.style.left = (e.clientX - r.left - d / 2) + 'px';
      s.style.top = (e.clientY - r.top - d / 2) + 'px';
      b.appendChild(s);
      setTimeout(function () { s.remove(); }, 600);
    } catch (err) { /* decorative only */ }
  });

  // ---------- Active nav highlight ----------
  const sections = $$('section[data-section]');
  const navLinks = $$('.nav__link');
  const navIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const id = '#' + e.target.id;
        navLinks.forEach(a => a.classList.toggle('is-active', a.getAttribute('href') === id));
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => s.id && navIO.observe(s));

  // Toast for placeholder links (footer etc): no deletion, just feedback
  document.addEventListener('click', (e)=>{
    const t=e.target.closest('[data-toast]');
    if(!t) return;
    e.preventDefault();
    const msg=t.dataset.toast||'Coming soon';
    const el=document.getElementById('toast');
    if(!el) return;
    el.textContent=msg;
    el.classList.add('is-show');
    clearTimeout(el._hide);
    el._hide=setTimeout(()=> el.classList.remove('is-show'), 2200);
  });
});
