/* =========================================================
   modals.js: open/close + form submit + auth
   ========================================================= */
import { openApp } from './dashboard.js?v=12';

export function initModals() {
  const modals = document.querySelectorAll('.modal');

  function open(name) {
    const m = document.getElementById('modal-' + name);
    if (!m) return;
    m.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function close(m) {
    m.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    const panel = m.querySelector('.modal__panel');
    if (panel) panel.dataset.state = 'signin';
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      const name = opener.dataset.open;
      open(name);
      return;
    }
    const appOpener = e.target.closest('[data-open-app]');
    if (appOpener) {
      e.preventDefault();
      const page = appOpener.dataset.page || 'overview';
      if (appOpener.dataset.doc) window.__pendingDoc = appOpener.dataset.doc;
      openApp(page);
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) {
      const m = closer.closest('.modal');
      if (m) close(m);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      modals.forEach(m => { if (m.getAttribute('aria-hidden') === 'false') close(m); });
    }
  });

  // Cross-component: platform card "open module" or any other surface
  // that doesn't carry [data-open-app] can dispatch this event to open
  // the dashboard at a specific page.
  window.addEventListener('intellirity:open-app', (e) => {
    const page = (e.detail && e.detail.page) || 'overview';
    openApp(page);
  });

  // Trial: create a real organization via the backend, then show success
  document.getElementById('trialForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const panel = form.closest('.modal__panel');
    const inputs = Array.from(form.querySelectorAll('.input'));
    const btn = form.querySelector('button[type="submit"]');
    const company = (inputs[2]?.value || '').trim() || 'My organization';
    const setDone = (line) => {
      const lede = panel.querySelector('.modal__inner--success .modal__lede');
      if (lede && line) lede.textContent = line;
      panel.dataset.state = 'success';
    };
    if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }
    try {
      const slug = company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'org';
      const r = await fetch('/api/v1/organizations/', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: company, slug })
      });
      if (!r.ok) throw new Error(await r.text());
      const org = await r.json();
      setDone(`Organization "${org.name || company}" created (id ${org.id || 'assigned'}). Check your email for setup instructions. Your 14-day trial starts now.`);
    } catch (err) {
      setDone(null);
    } finally {
      if (btn) { btn.disabled = false; }
    }
  });
  // Contact: file a real ticket via the backend, then show its number
  document.getElementById('contactForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const panel = form.closest('.modal__panel');
    const inputs = Array.from(form.querySelectorAll('.input, .textarea'));
    const btn = form.querySelector('button[type="submit"]');
    const setDone = (line) => {
      const lede = panel.querySelector('.modal__inner--success .modal__lede');
      if (lede && line) lede.textContent = line;
      panel.dataset.state = 'success';
    };
    if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
    try {
      const r = await fetch('/api/v1/system/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: (inputs[0]?.value || '').trim(),
          email: (inputs[1]?.value || '').trim(),
          subject: (inputs[2]?.value || '').trim(),
          message: (inputs[3]?.value || '').trim()
        })
      });
      if (!r.ok) throw new Error(await r.text());
      const t = await r.json();
      setDone(`Ticket ${t.ticket || 'created'}. ${t.message || 'We respond within four business hours.'}`);
    } catch (err) {
      setDone(null);
    } finally {
      if (btn) { btn.disabled = false; }
    }
  });

  // Auth tab switcher
  const switcher = document.getElementById('authSwitch');
  if (switcher) {
    switcher.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.authTab;
        switcher.querySelectorAll('button').forEach(b => b.classList.toggle('is-active', b === btn));
        const panel = document.getElementById('modal-auth').querySelector('.modal__panel');
        panel.dataset.state = tab;
        document.querySelectorAll('[data-auth-pane]').forEach(p => {
          p.hidden = p.dataset.authPane !== tab;
        });
      });
    });
    document.querySelectorAll('[data-auth-tab]').forEach(b => {
      b.addEventListener('click', () => {
        const t = b.dataset.authTab;
        switcher.querySelector(`[data-auth-tab="${t}"]`)?.click();
      });
    });
  }

  // Auth submit -> open app
  document.querySelectorAll('.auth__form').forEach(f => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      document.querySelectorAll('.modal').forEach(m => close(m));
      openApp();
    });
  });
}