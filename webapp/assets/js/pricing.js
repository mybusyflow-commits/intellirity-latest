/* =========================================================
   pricing.js: monthly/annual toggle (two honest plans)
   ========================================================= */

export function initPricing() {
  // Toggle
  const toggle = document.getElementById('billingToggle');
  if (!toggle) return;
  toggle.querySelectorAll('.billing-toggle__opt').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.billing;
      toggle.dataset.billing = mode;
      toggle.querySelectorAll('.billing-toggle__opt').forEach(b => b.classList.toggle('is-active', b === btn));
      document.querySelectorAll('.plan__amount').forEach(amt => {
        const monthly = amt.dataset.monthly;
        const annual  = amt.dataset.annual;
        if (monthly && annual) {
          const n = Number(mode === 'annual' ? annual : monthly);
          amt.textContent = '₹' + n.toLocaleString('en-IN');
        }
      });
    });
  });
}
