/* =========================================================
   bg-3d.js: constellation depth field (vanilla Three.js).
   Native recreation of the ConstellationField / DefenseLines
   look from the ThreeUI component set, rebuilt for this stack
   (React components cannot mount on a static page): slow steel
   points drifting in depth with faint neighbor links, graphite
   fog, mouse parallax. Returns false when Three.js is missing
   so the caller can fall back to the 2D field.
   ========================================================= */
export function initBg3D(canvas) {
  try {
    if (!canvas) return false;
    if (typeof THREE === 'undefined') return false;

    var reduce = window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: false });
    } catch (e) {
      return false;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

    var scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0b0d, 0.0016);

    var camera = new THREE.PerspectiveCamera(60, 1, 1, 4000);
    camera.position.z = 520;

    var COUNT = 90;
    var DEPTH = 620;
    var LINK = 150;
    var W = 0;
    var H = 0;

    var pos = new Float32Array(COUNT * 3);
    var vel = new Float32Array(COUNT * 3);
    var pts = [];
    var i;
    for (i = 0; i < COUNT; i++) {
      pts.push({
        x: (Math.random() - 0.5),
        y: (Math.random() - 0.5),
        z: (Math.random() - 0.5)
      });
      vel[i * 3] = (Math.random() - 0.5) * 0.0006;
      vel[i * 3 + 1] = (Math.random() - 0.5) * 0.0006;
      vel[i * 3 + 2] = (Math.random() - 0.5) * 0.0004;
    }

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    var mat = new THREE.PointsMaterial({
      color: 0x8a99ae,
      size: 1.8,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    var points = new THREE.Points(geo, mat);
    scene.add(points);

    var maxPairs = (COUNT * (COUNT - 1)) / 2;
    var linePos = new Float32Array(maxPairs * 6);
    var lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    var lineMat = new THREE.LineBasicMaterial({
      color: 0x7d8aa0,
      transparent: true,
      opacity: 0.12,
      depthWrite: false
    });
    var lines = new THREE.LineSegments(lineGeo, lineMat);
    lines.frustumCulled = false;
    scene.add(lines);

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    function project() {
      var k = 0;
      var n;
      for (n = 0; n < COUNT; n++) {
        pos[n * 3] = pts[n].x * W;
        pos[n * 3 + 1] = pts[n].y * H;
        pos[n * 3 + 2] = pts[n].z * DEPTH;
      }
      geo.attributes.position.needsUpdate = true;
      var a, b, dx, dy, dz, d2;
      var li = 0;
      for (a = 0; a < COUNT; a++) {
        for (b = a + 1; b < COUNT; b++) {
          dx = pos[a * 3] - pos[b * 3];
          dy = pos[a * 3 + 1] - pos[b * 3 + 1];
          dz = (pos[a * 3 + 2] - pos[b * 3 + 2]) * 0.4;
          d2 = dx * dx + dy * dy + dz * dz;
          if (d2 < LINK * LINK * 4 && li < maxPairs) {
            linePos[li * 6] = pos[a * 3];
            linePos[li * 6 + 1] = pos[a * 3 + 1];
            linePos[li * 6 + 2] = pos[a * 3 + 2];
            linePos[li * 6 + 3] = pos[b * 3];
            linePos[li * 6 + 4] = pos[b * 3 + 1];
            linePos[li * 6 + 5] = pos[b * 3 + 2];
            li++;
          }
        }
      }
      lineGeo.setDrawRange(0, li * 2);
      lineGeo.attributes.position.needsUpdate = true;
    }

    var mx = 0;
    var my = 0;
    var tx = 0;
    var ty = 0;
    window.addEventListener('pointermove', function (e) {
      tx = (e.clientX / W - 0.5) * 2;
      ty = (e.clientY / H - 0.5) * 2;
    }, { passive: true });

    function step() {
      var n;
      for (n = 0; n < COUNT; n++) {
        pts[n].x += vel[n * 3];
        pts[n].y += vel[n * 3 + 1];
        pts[n].z += vel[n * 3 + 2];
        if (pts[n].x > 0.5 || pts[n].x < -0.5) vel[n * 3] *= -1;
        if (pts[n].y > 0.5 || pts[n].y < -0.5) vel[n * 3 + 1] *= -1;
        if (pts[n].z > 0.5 || pts[n].z < -0.5) vel[n * 3 + 2] *= -1;
      }
      project();
      mx += (tx - mx) * 0.03;
      my += (ty - my) * 0.03;
      camera.position.x = mx * 40;
      camera.position.y = -my * 30;
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    }

    project();
    if (reduce) {
      renderer.render(scene, camera);
      return true;
    }

    var running = true;
    document.addEventListener('visibilitychange', function () {
      running = !document.hidden;
      if (running) requestAnimationFrame(frame);
    });
    (function frame() {
      if (!running) return;
      step();
      requestAnimationFrame(frame);
    })();
    return true;
  } catch (e) {
    if (window.console) console.warn('bg3d', e);
    return false;
  }
}
