/* =========================================================
   liquid-cta.js: mounts the genuine LiquidMetalButton artifact
   (vendored standalone build from @designcodeio/threeui, MIT)
   as the closing-section CTA. Same-origin iframe, so the parent
   sets its label and receives its activate event over the
   artifact's own postMessage bridge. Native button stays in
   the DOM as the click proxy and as the reduced-motion /
   load-failure fallback.
   ========================================================= */
export function initLiquidCta() {
  const wrap = document.getElementById('trialLiquid');
  if (!wrap) return;
  const frame = wrap.querySelector('.lm-frame');
  const fallback = wrap.querySelector('.lm-fallback');
  if (!frame || !fallback) return;

  const reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    wrap.classList.add('lm-off');
    return;
  }

  let ready = false;
  const pushConfig = function () {
    try {
      frame.contentWindow.postMessage({
        liquidMetalButton: {
          text: 'Start trial',
          pillWidthUnits: 2300,
          embedded: true
        }
      }, window.location.origin);
    } catch (e) { /* fallback timer covers this */ }
  };

  frame.addEventListener('load', function () {
    ready = true;
    // The artifact boots its renderer on load; configure right after.
    setTimeout(pushConfig, 350);
    setTimeout(pushConfig, 1200);
  });

  window.addEventListener('message', function (e) {
    if (e.source !== frame.contentWindow) return;
    const msg = e.data && e.data.liquidMetalButton;
    if (msg && msg.type === 'activate') fallback.click();
  });

  // If the artifact never boots (blocked CDN, WebGL off), fall back.
  setTimeout(function () {
    if (!ready) wrap.classList.add('lm-off');
  }, 6000);
}
