/* =========================================================
   bg-field.js — restrained depth field
   Plain Canvas2D rendering of a sparse, dim point cloud
   that suggests depth without motion gimmicks.
   No WebGL. No spin. No parallax excess.
   ========================================================= */
export function initField(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0;

  function resize() {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  }
  resize();
  addEventListener('resize', resize);

  // Generate points once — fixed distribution
  const COUNT = 320;
  const points = [];
  for (let i = 0; i < COUNT; i++) {
    points.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.4 + Math.random() * 1.2,
      a: 0.06 + Math.random() * 0.14
    });
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    // Single warm halo
    const hx = w * 0.7;
    const hy = h * 0.18;
    const hr = Math.max(w, h) * 0.55;
    const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, hr);
    g.addColorStop(0, 'rgba(125, 138, 160, 0.05)');
    g.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Points
    for (const p of points) {
      ctx.fillStyle = `rgba(232, 232, 227, ${p.a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    requestAnimationFrame(frame);
  }
  frame();
}