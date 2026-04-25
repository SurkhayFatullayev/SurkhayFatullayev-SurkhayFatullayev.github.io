// 2D Physics Engine - ASCII particles with gravity, collision, mouse interaction
(function() {
  const canvas = document.getElementById('physics-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CHARS = ['.', '+', 'x', '*', 'o', '#', '|', '-', '/', '\\', '~', '^', '0', '1'];
  const BG = '#f5f5f0';
  const INK = '#181818';
  const FAINT = 'rgba(24,24,24,0.15)';

  let W, H, particles = [], mouse = { x: -999, y: -999, down: false };
  const GRAVITY = 0.12;
  const FRICTION = 0.985;
  const REPEL_RADIUS = 90;
  const REPEL_FORCE = 3.5;
  const MAX_P = 55;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function randomChar() {
    return CHARS[Math.floor(Math.random() * CHARS.length)];
  }

  function spawnParticle(x, y, vx, vy) {
    particles.push({
      x: x ?? Math.random() * W,
      y: y ?? -10,
      vx: vx ?? (Math.random() - 0.5) * 2,
      vy: vy ?? Math.random() * 2,
      char: randomChar(),
      size: 11 + Math.floor(Math.random() * 8),
      alpha: 0.18 + Math.random() * 0.45,
      mass: 1 + Math.random(),
      life: 1,
      decay: 0.0008 + Math.random() * 0.001,
      born: performance.now()
    });
  }

  // AABB grid collision (simple)
  function collidePairs() {
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (a.size + b.size) * 0.45;
        if (dist < minDist && dist > 0.1) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          // elastic collision
          const relVx = b.vx - a.vx;
          const relVy = b.vy - a.vy;
          const dot = relVx * nx + relVy * ny;
          if (dot < 0) {
            const impulse = (2 * dot) / (a.mass + b.mass);
            a.vx += impulse * b.mass * nx;
            a.vy += impulse * b.mass * ny;
            b.vx -= impulse * a.mass * nx;
            b.vy -= impulse * a.mass * ny;
          }
        }
      }
    }
  }

  function update() {
    const now = performance.now();

    // Spawn occasionally
    if (particles.length < MAX_P && Math.random() < 0.04) {
      spawnParticle();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      // Gravity
      p.vy += GRAVITY;

      // Mouse repulsion / attraction
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < REPEL_RADIUS && dist > 1) {
        const force = (REPEL_RADIUS - dist) / REPEL_RADIUS;
        const dir = mouse.down ? -1 : 1; // attract on click, repel otherwise
        p.vx += (dx / dist) * force * REPEL_FORCE * dir;
        p.vy += (dy / dist) * force * REPEL_FORCE * dir;
        // mutate char on close approach
        if (dist < 40 && Math.random() < 0.08) p.char = randomChar();
      }

      // Friction
      p.vx *= FRICTION;
      p.vy *= FRICTION;

      // Integrate
      p.x += p.vx;
      p.y += p.vy;

      // Floor bounce
      if (p.y > H - 20) {
        p.y = H - 20;
        p.vy *= -0.5;
        p.vx *= 0.97;
        if (Math.abs(p.vy) < 0.5) p.vy = 0;
      }

      // Wall bounce
      if (p.x < 10) { p.x = 10; p.vx *= -0.6; }
      if (p.x > W - 10) { p.x = W - 10; p.vx *= -0.6; }

      // Fade
      p.life -= p.decay;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    collidePairs();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Draw faint grid lines for texture
    ctx.strokeStyle = 'rgba(24,24,24,0.04)';
    ctx.lineWidth = 0.5;
    const step = 40;
    for (let x = 0; x < W; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha * p.life;
      ctx.fillStyle = INK;
      ctx.font = `${p.size}px "Share Tech Mono", monospace`;
      ctx.fillText(p.char, p.x, p.y);
      ctx.restore();
    }

    // Mouse crosshair
    if (mouse.x > 0 && mouse.x < W) {
      ctx.save();
      ctx.strokeStyle = 'rgba(24,24,24,0.25)';
      ctx.lineWidth = 0.5;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(mouse.x, 0); ctx.lineTo(mouse.x, H); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, mouse.y); ctx.lineTo(W, mouse.y); ctx.stroke();
      ctx.restore();

      // Coordinate label
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = INK;
      ctx.font = '10px "Share Tech Mono", monospace';
      ctx.fillText(`[${Math.round(mouse.x)},${Math.round(mouse.y)}]`, mouse.x + 8, mouse.y - 6);
      ctx.restore();
    }
  }

  function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  // Events
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('mousedown', e => {
    mouse.down = true;
    // burst spawn on click
    for (let i = 0; i < 5; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      spawnParticle(
        e.clientX + (Math.random() - 0.5) * 20,
        e.clientY + (Math.random() - 0.5) * 20,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed
      );
    }
  });

  window.addEventListener('mouseup', () => { mouse.down = false; });

  window.addEventListener('mouseleave', () => {
    mouse.x = -999; mouse.y = -999;
  });

  resize();
  // Seed initial particles
  for (let i = 0; i < 25; i++) spawnParticle();
  loop();
})();