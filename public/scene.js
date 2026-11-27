const OrbitalScene = (() => {
  const canvas = document.getElementById('orbital-canvas');
  const ctx = canvas.getContext('2d');

  let w = 0;
  let h = 0;
  let angle = 0;
  let pointerX = 0;
  let pointerY = 0;
  let smoothX = 0;
  let smoothY = 0;
  let urgency = 'normal';
  let theme = 'paper';

  const spherePoints = [];
  const fractures = [];
  const satellites = [
    { rScale: 1.24, speed: 0.45, offset: 0.4, size: 4.5 },
    { rScale: 1.48, speed: -0.28, offset: 2.1, size: 3.5 },
    { rScale: 1.72, speed: 0.18, offset: 4.3, size: 3 }
  ];

  function buildGeometry() {
    spherePoints.length = 0;
    const count = 210;
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = golden * i;
      spherePoints.push({
        x: Math.cos(theta) * radius,
        y,
        z: Math.sin(theta) * radius,
        size: (i % 5 === 0) ? 2.4 : 1.3
      });
    }

    fractures.length = 0;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.25;
      fractures.push({
        a,
        len: 0.35 + (i % 4) * 0.16,
        bend: (i % 2 === 0 ? 1 : -1) * 0.24
      });
    }
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = window.innerWidth;
    h = window.innerHeight;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function palette() {
    const isDark = theme === 'obsidian';
    if (urgency === 'critical') {
      return {
        accent: isDark ? 'rgba(220, 38, 38, ' : 'rgba(185, 28, 28, ',
        ink: isDark ? 'rgba(236, 234, 228, ' : 'rgba(17, 19, 18, '
      };
    }
    if (urgency === 'warning') {
      return {
        accent: isDark ? 'rgba(217, 119, 6, ' : 'rgba(180, 83, 9, ',
        ink: isDark ? 'rgba(236, 234, 228, ' : 'rgba(17, 19, 18, '
      };
    }
    return {
      accent: isDark ? 'rgba(25, 163, 91, ' : 'rgba(11, 110, 60, ',
      ink: isDark ? 'rgba(236, 234, 228, ' : 'rgba(17, 19, 18, '
    };
  }

  function drawStar(x, y, r, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.18, -r * 0.18);
    ctx.lineTo(r, 0);
    ctx.lineTo(r * 0.18, r * 0.18);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.18, r * 0.18);
    ctx.lineTo(-r, 0);
    ctx.lineTo(-r * 0.18, -r * 0.18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);

    smoothX += (pointerX - smoothX) * 0.04;
    smoothY += (pointerY - smoothY) * 0.04;

    const speed = urgency === 'critical' ? 0.0085 : urgency === 'warning' ? 0.005 : 0.0028;
    angle += speed;

    const colors = palette();
    const cx = w * 0.76 + smoothX * 18;
    const cy = h * 0.56 + smoothY * 14;
    const baseR = Math.min(w, h) * 0.25;

    ctx.strokeStyle = colors.accent + '0.24)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(cx - baseR * 1.9, cy);
    ctx.lineTo(cx + baseR * 1.4, cy);
    ctx.moveTo(cx, cy - baseR * 1.7);
    ctx.lineTo(cx, cy + baseR * 1.5);
    ctx.stroke();

    [1.15, 1.45, 1.78].forEach((scale, idx) => {
      ctx.beginPath();
      ctx.setLineDash(idx === 1 ? [5, 7] : []);
      ctx.strokeStyle = colors.accent + (idx === 0 ? '0.32)' : '0.18)');
      ctx.arc(cx, cy, baseR * scale, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(cx, cy, baseR, 0, Math.PI * 2);
    ctx.fillStyle = colors.ink + (theme === 'obsidian' ? '0.07)' : '0.055)');
    ctx.fill();
    ctx.strokeStyle = colors.ink + '0.16)';
    ctx.stroke();

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    for (let i = 0; i < spherePoints.length; i++) {
      const p = spherePoints[i];
      const rx = p.x * cosA - p.z * sinA;
      const rz = p.x * sinA + p.z * cosA;
      if (rz < -0.15) continue;

      const px = cx + rx * baseR;
      const py = cy + p.y * baseR;
      const alpha = (0.14 + (rz + 0.15) * 0.34).toFixed(3);

      ctx.fillStyle = colors.ink + alpha + ')';
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = colors.accent + '0.22)';
    ctx.lineWidth = 1;
    fractures.forEach((f) => {
      const a1 = f.a + angle * 0.45;
      const x1 = cx + Math.cos(a1) * (baseR * 0.28);
      const y1 = cy + Math.sin(a1) * (baseR * 0.28);
      const x2 = cx + Math.cos(a1 + f.bend) * (baseR * (0.28 + f.len));
      const y2 = cy + Math.sin(a1 + f.bend) * (baseR * (0.28 + f.len));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });

    satellites.forEach((sat) => {
      const sa = angle * sat.speed * 2.4 + sat.offset;
      const sx = cx + Math.cos(sa) * baseR * sat.rScale;
      const sy = cy + Math.sin(sa) * baseR * sat.rScale;
      ctx.fillStyle = colors.accent + '0.85)';
      ctx.beginPath();
      ctx.arc(sx, sy, sat.size, 0, Math.PI * 2);
      ctx.fill();
    });

    drawStar(cx + baseR * 1.18, cy - baseR * 1.05, 11, colors.accent + '0.55)');
    drawStar(cx - baseR * 1.38, cy + baseR * 0.72, 8, colors.accent + '0.45)');

    requestAnimationFrame(frame);
  }

  function init() {
    buildGeometry();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', (e) => {
      pointerX = (e.clientX / Math.max(1, w) - 0.5) * 2;
      pointerY = (e.clientY / Math.max(1, h) - 0.5) * 2;
    });
    requestAnimationFrame(frame);
  }

  function setUrgency(next) {
    urgency = next;
  }

  function setTheme(next) {
    theme = next;
  }

  return { init, setUrgency, setTheme };
})();
