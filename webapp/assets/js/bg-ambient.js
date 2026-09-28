/* =========================================================
   bg-ambient.js — subtle moving gradient halo
   A soft warm "spotlight" that drifts very slowly.
   No particle animations, no data packets.
   ========================================================= */
export function initAmbient(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  resize();
  addEventListener('resize', resize);

  const start = performance.now();
  function tick() {
    const t = (performance.now() - start) / 1000;
    ctx.clearRect(0, 0, w, h);

    // Single large warm halo, drifting slowly
    const x = w * 0.7 + Math.cos(t * 0.04) * 80;
    const y = h * 0.2 + Math.sin(t * 0.03) * 60;

    const g = ctx.createRadialGradient(x, y, 0, x, y, Math.max(w, h) * 0.65);
    g.addColorStop(0, 'rgba(216, 162, 74, 0.06)');
    g.addColorStop(0.4, 'rgba(216, 162, 74, 0.02)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // A second, much dimmer cool halo
    const x2 = w * 0.2 + Math.cos(t * 0.025) * 100;
    const y2 = h * 0.8 + Math.sin(t * 0.018) * 80;
    const g2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, Math.max(w, h) * 0.5);
    g2.addColorStop(0, 'rgba(70, 80, 100, 0.05)');
    g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(tick);
  }
  tick();
}