import * as THREE from 'three';

// ==========================================================================
// PROCEDURAL TEXTURES
// Everything is painted on canvases at start-up so the scene needs no image
// downloads, yet surfaces read as real materials: sandstone, fired clay,
// powder rangoli, rice paper, rippled water and a lamp-lit haveli.
// ==========================================================================

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Small deterministic PRNG so textures look the same on every load
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function toTexture(canvas, { srgb = true, repeat = null, aniso = 8 } = {}) {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  tex.anisotropy = aniso;
  return tex;
}

// Fine grain noise laid over a canvas (stone pores, clay grit, paper fibre)
function grain(ctx, w, h, amount, rand, mono = true) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rand() - 0.5) * amount;
    if (mono) {
      d[i] += n; d[i + 1] += n; d[i + 2] += n;
    } else {
      d[i] += n; d[i + 1] += (rand() - 0.5) * amount; d[i + 2] += (rand() - 0.5) * amount;
    }
  }
  ctx.putImageData(img, 0, 0);
}

// Soft blotches for natural colour variation
function blotches(ctx, w, h, count, colors, rand, rMin, rMax, alpha) {
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = rMin + rand() * (rMax - rMin);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const col = colors[Math.floor(rand() * colors.length)];
    g.addColorStop(0, col.replace('A', alpha.toFixed(3)));
    g.addColorStop(1, col.replace('A', '0'));
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
}

// --------------------------------------------------------------------------
// Sandstone courtyard tiles (colour + bump)
// --------------------------------------------------------------------------
export function createSandstoneTiles(repeat = [6, 4]) {
  const size = 1024;
  const tiles = 4;
  const cell = size / tiles;
  const rand = rng(7);

  const color = makeCanvas(size, size);
  const ctx = color.getContext('2d');
  const bump = makeCanvas(size, size);
  const bctx = bump.getContext('2d');

  ctx.fillStyle = '#7a5a43';
  ctx.fillRect(0, 0, size, size);
  bctx.fillStyle = '#202020';
  bctx.fillRect(0, 0, size, size);

  const grout = 6;
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      const x = tx * cell + grout / 2;
      const y = ty * cell + grout / 2;
      const w = cell - grout;
      const tone = 0.86 + rand() * 0.22;
      const r = Math.round(176 * tone), g = Math.round(132 * tone), b = Math.round(96 * tone);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, w, w);

      // worn edges
      const edge = ctx.createLinearGradient(x, y, x + w, y + w);
      edge.addColorStop(0, 'rgba(255,230,200,0.06)');
      edge.addColorStop(1, 'rgba(60,30,10,0.10)');
      ctx.fillStyle = edge;
      ctx.fillRect(x, y, w, w);

      bctx.fillStyle = `rgb(${Math.round(190 + rand() * 30)},${Math.round(190 + rand() * 30)},${Math.round(190 + rand() * 30)})`;
      bctx.fillRect(x + 2, y + 2, w - 4, w - 4);
    }
  }

  // Sandstone bedding streaks
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < 120; i++) {
    ctx.strokeStyle = rand() > 0.5 ? '#5b3a22' : '#e9c9a0';
    ctx.lineWidth = 1 + rand() * 4;
    ctx.beginPath();
    const y0 = rand() * size;
    ctx.moveTo(0, y0);
    for (let x = 0; x <= size; x += 64) ctx.lineTo(x, y0 + Math.sin(x * 0.01 + i) * 10 + rand() * 6);
    ctx.stroke();
  }
  ctx.restore();

  blotches(ctx, size, size, 90, ['rgba(70,40,20,A)', 'rgba(230,200,160,A)', 'rgba(120,70,40,A)'], rand, 20, 90, 0.12);
  grain(ctx, size, size, 26, rand);
  grain(bctx, size, size, 40, rand);

  return {
    map: toTexture(color, { repeat }),
    bumpMap: toTexture(bump, { srgb: false, repeat })
  };
}

// --------------------------------------------------------------------------
// Plain sandstone for pillars, steps and walls
// --------------------------------------------------------------------------
export function createSandstone(repeat = [2, 2], tint = [170, 128, 92]) {
  const size = 512;
  const rand = rng(21);
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = `rgb(${tint[0]},${tint[1]},${tint[2]})`;
  ctx.fillRect(0, 0, size, size);
  blotches(ctx, size, size, 60, ['rgba(80,45,25,A)', 'rgba(235,205,165,A)'], rand, 10, 60, 0.14);
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 50; i++) {
    ctx.strokeStyle = rand() > 0.5 ? '#4a2c18' : '#f0d2a8';
    ctx.lineWidth = 1 + rand() * 3;
    ctx.beginPath();
    const y0 = rand() * size;
    ctx.moveTo(0, y0);
    ctx.bezierCurveTo(size * 0.3, y0 + rand() * 20 - 10, size * 0.6, y0 + rand() * 20 - 10, size, y0);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  grain(ctx, size, size, 30, rand);
  return toTexture(c, { repeat });
}

// --------------------------------------------------------------------------
// Fired terracotta for clay diyas, optionally hand painted
// --------------------------------------------------------------------------
export function createTerracotta(painted = false, seed = 3) {
  const w = 512, h = 256;
  const rand = rng(seed);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#9b4a28';
  ctx.fillRect(0, 0, w, h);
  blotches(ctx, w, h, 70, ['rgba(60,22,8,A)', 'rgba(196,110,62,A)', 'rgba(40,18,8,A)'], rand, 8, 40, 0.22);

  // Throwing rings from the potter's wheel run around the bowl (along u)
  ctx.globalAlpha = 0.12;
  for (let y = 0; y < h; y += 3 + rand() * 4) {
    ctx.fillStyle = rand() > 0.5 ? '#3c1608' : '#d18456';
    ctx.fillRect(0, y, w, 1);
  }
  ctx.globalAlpha = 1;

  if (painted) {
    // Lathe v runs bottom (0) to rim and down inside (1); the outer upper wall
    // sits around v = 0.35 to 0.55, which is canvas y = h * (1 - v).
    const bandTop = h * (1 - 0.6);
    const bandBot = h * (1 - 0.34);
    ctx.fillStyle = '#d4301f';
    ctx.fillRect(0, bandTop, w, bandBot - bandTop);
    ctx.fillStyle = '#ffc531';
    ctx.fillRect(0, bandTop, w, 7);
    ctx.fillRect(0, bandBot - 7, w, 7);
    ctx.fillStyle = '#fff6e6';
    const mid = (bandTop + bandBot) / 2;
    for (let x = 10; x < w; x += 32) {
      ctx.beginPath();
      ctx.arc(x, mid, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#ffc531';
    for (let x = 26; x < w; x += 32) {
      ctx.beginPath();
      ctx.ellipse(x, mid, 4, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  grain(ctx, w, h, 34, rand);
  const tex = toTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// --------------------------------------------------------------------------
// Powder rangoli, painted with grain and spill so it reads as coloured powder
// --------------------------------------------------------------------------
export function createRangoli() {
  const size = 1024;
  const cx = size / 2, cy = size / 2;
  const rand = rng(11);
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');

  const COL = {
    sindoor: '#c62a1f',
    rani: '#c2185b',
    marigold: '#ef7d11',
    turmeric: '#f4b81c',
    leaf: '#2f8a3e',
    indigo: '#2346a8',
    purple: '#6d2a8f',
    chalk: '#f6efe2'
  };

  const radial = (n, fn) => {
    for (let i = 0; i < n; i++) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i / n) * Math.PI * 2);
      fn(i);
      ctx.restore();
    }
  };

  const petal = (r0, r1, wid) => {
    ctx.beginPath();
    ctx.moveTo(0, r0);
    ctx.bezierCurveTo(wid, r0 + (r1 - r0) * 0.3, wid * 0.8, r0 + (r1 - r0) * 0.8, 0, r1);
    ctx.bezierCurveTo(-wid * 0.8, r0 + (r1 - r0) * 0.8, -wid, r0 + (r1 - r0) * 0.3, 0, r0);
    ctx.closePath();
  };

  const outline = (w = 5) => {
    ctx.strokeStyle = COL.chalk;
    ctx.lineWidth = w;
    ctx.stroke();
  };

  // 1. outer band and scallops
  ctx.beginPath();
  ctx.arc(cx, cy, 440, 0, Math.PI * 2);
  ctx.arc(cx, cy, 395, 0, Math.PI * 2, true);
  ctx.fillStyle = COL.leaf;
  ctx.fill();

  radial(32, (i) => {
    ctx.beginPath();
    ctx.arc(0, 440, 26, 0, Math.PI);
    ctx.fillStyle = i % 2 ? COL.marigold : COL.turmeric;
    ctx.fill();
    outline(4);
  });

  // chalk dot ring
  radial(96, () => {
    ctx.beginPath();
    ctx.arc(0, 488, 5, 0, Math.PI * 2);
    ctx.fillStyle = COL.chalk;
    ctx.fill();
  });

  // 2. sixteen large petals
  radial(16, (i) => {
    petal(150, 392, 70);
    ctx.fillStyle = i % 2 ? COL.rani : COL.purple;
    ctx.fill();
    outline(5);
    petal(190, 340, 34);
    ctx.fillStyle = i % 2 ? COL.turmeric : COL.marigold;
    ctx.fill();
    petal(230, 300, 13);
    ctx.fillStyle = COL.sindoor;
    ctx.fill();
  });

  // little indigo drops between big petals
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(Math.PI / 16);
  ctx.translate(-cx, -cy);
  radial(16, () => {
    petal(300, 380, 18);
    ctx.fillStyle = COL.indigo;
    ctx.fill();
    outline(3);
  });
  ctx.restore();

  // 3. inner lotus
  radial(8, (i) => {
    petal(70, 205, 62);
    ctx.fillStyle = i % 2 ? COL.marigold : COL.sindoor;
    ctx.fill();
    outline(5);
  });

  // 4. centre medallion
  ctx.beginPath();
  ctx.arc(cx, cy, 104, 0, Math.PI * 2);
  ctx.fillStyle = COL.leaf;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 82, 0, Math.PI * 2);
  ctx.fillStyle = COL.turmeric;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, 60, 0, Math.PI * 2);
  ctx.fillStyle = COL.sindoor;
  ctx.fill();
  radial(24, () => {
    ctx.beginPath();
    ctx.arc(0, 93, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = COL.chalk;
    ctx.fill();
  });

  // --- Powder treatment: grain, edge erosion and stray spill ---
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const n = (rand() - 0.5) * 60;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    // coarse powder leaves tiny gaps
    if (rand() < 0.05) d[i + 3] = 120 + rand() * 80;
  }
  ctx.putImageData(img, 0, 0);

  // stray grains just beyond the shapes
  const spill = [COL.marigold, COL.turmeric, COL.rani, COL.chalk, COL.leaf];
  for (let i = 0; i < 9000; i++) {
    const a = rand() * Math.PI * 2;
    const r = 60 + rand() * 450;
    ctx.fillStyle = spill[Math.floor(rand() * spill.length)];
    ctx.globalAlpha = 0.35 + rand() * 0.4;
    ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.6, 1.6);
  }
  ctx.globalAlpha = 1;

  const tex = toTexture(c);
  return tex;
}

// --------------------------------------------------------------------------
// Rice-paper sky lantern: bright at the flame, cooler towards the top
// --------------------------------------------------------------------------
export function createLanternPaper(hue = 'amber', seed = 5) {
  const w = 256, h = 256;
  const rand = rng(seed);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, h, 0, 0);
  if (hue === 'rose') {
    g.addColorStop(0, '#fff2c8');
    g.addColorStop(0.35, '#ffb070');
    g.addColorStop(1, '#c2433a');
  } else {
    g.addColorStop(0, '#fff6d6');
    g.addColorStop(0.35, '#ffc469');
    g.addColorStop(1, '#d86a1c');
  }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // paper fibres
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 400; i++) {
    ctx.strokeStyle = rand() > 0.5 ? '#7a3a10' : '#fff';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    const x = rand() * w, y = rand() * h;
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 30, y + (rand() - 0.5) * 8);
    ctx.stroke();
  }
  // panel seams
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#6b2a0a';
  for (let x = 0; x < w; x += w / 6) ctx.fillRect(x, 0, 1.5, h);
  ctx.globalAlpha = 1;
  return toTexture(c);
}

// --------------------------------------------------------------------------
// Anar paper wrap
// --------------------------------------------------------------------------
export function createAnarWrap() {
  const w = 256, h = 128;
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#b3201a';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f2c14a';
  for (let y = 18; y < h; y += 34) ctx.fillRect(0, y, w, 6);
  ctx.fillStyle = '#1f5d3a';
  for (let x = 0; x < w; x += 32) {
    ctx.beginPath();
    ctx.arc(x + 16, 46, 6, 0, Math.PI * 2);
    ctx.fill();
  }
  grain(ctx, w, h, 20, rng(9));
  const t = toTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// --------------------------------------------------------------------------
// Soft radial glow sprite (flame halos, light pools, sparks)
// --------------------------------------------------------------------------
export function createGlowTexture(size = 128, stops = null) {
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  const s = stops || [
    [0, 'rgba(255,255,255,1)'],
    [0.2, 'rgba(255,255,255,0.55)'],
    [0.5, 'rgba(255,255,255,0.15)'],
    [1, 'rgba(255,255,255,0)']
  ];
  s.forEach(([o, col]) => g.addColorStop(o, col));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// --------------------------------------------------------------------------
// Tileable water normal map
// --------------------------------------------------------------------------
export function createWaterNormals() {
  const size = 256;
  const rand = rng(17);
  const waves = [];
  for (let i = 0; i < 18; i++) {
    // integer frequencies keep the map tileable
    waves.push({
      fx: Math.floor(rand() * 7) - 3,
      fy: Math.floor(rand() * 7) - 3 || 1,
      ph: rand() * Math.PI * 2,
      a: 0.4 + rand()
    });
  }
  const height = (x, y) => {
    let hgt = 0;
    for (const wv of waves) {
      hgt += wv.a * Math.sin(((wv.fx * x + wv.fy * y) / size) * Math.PI * 2 * 2 + wv.ph);
    }
    return hgt;
  };
  const c = makeCanvas(size, size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = height(x + 1, y) - height(x - 1, y);
      const dy = height(x, y + 1) - height(x, y - 1);
      const nx = -dx * 0.6, ny = -dy * 0.6, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      d[i] = ((nx / l) * 0.5 + 0.5) * 255;
      d[i + 1] = ((ny / l) * 0.5 + 0.5) * 255;
      d[i + 2] = ((nz / l) * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// --------------------------------------------------------------------------
// Distant town skyline wrapped around the horizon: rooftops, temple
// shikharas and thousands of tiny window and diya lights
// --------------------------------------------------------------------------
export function createSkyline() {
  const w = 4096, h = 512;
  const rand = rng(31);
  const color = makeCanvas(w, h);
  const ctx = color.getContext('2d');

  const drawLayer = (base, maxH, shade, lights) => {
    let x = 0;
    while (x < w) {
      const bw = 40 + rand() * 120;
      const bh = base + rand() * maxH;
      const top = h - bh;
      ctx.fillStyle = shade;
      const kind = rand();
      if (kind < 0.08) {
        // temple shikhara
        const tw = bw * 0.9;
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x, top + bh * 0.45);
        ctx.quadraticCurveTo(x + tw * 0.1, top + bh * 0.1, x + tw / 2, top - 30);
        ctx.quadraticCurveTo(x + tw * 0.9, top + bh * 0.1, x + tw, top + bh * 0.45);
        ctx.lineTo(x + tw, h);
        ctx.fill();
        ctx.fillRect(x + tw / 2 - 1, top - 50, 2, 22); // flag pole
        ctx.fillStyle = '#ff9a2a';
        ctx.beginPath();
        ctx.moveTo(x + tw / 2 + 1, top - 50);
        ctx.lineTo(x + tw / 2 + 14, top - 45);
        ctx.lineTo(x + tw / 2 + 1, top - 40);
        ctx.fill();
      } else if (kind < 0.2) {
        // dome
        ctx.fillRect(x, top + 20, bw, bh);
        ctx.beginPath();
        ctx.ellipse(x + bw / 2, top + 22, bw * 0.32, 26, 0, Math.PI, 0);
        ctx.fill();
      } else {
        ctx.fillRect(x, top, bw, bh);
        if (rand() < 0.4) ctx.fillRect(x + bw * 0.2, top - 10, bw * 0.6, 10); // parapet
      }

      if (lights) {
        // windows
        for (let wy = top + 12; wy < h - 10; wy += 16 + rand() * 6) {
          for (let wx = x + 6; wx < x + bw - 8; wx += 12 + rand() * 10) {
            if (rand() < 0.28) {
              ctx.fillStyle = rand() < 0.8 ? 'rgba(255,178,80,0.9)' : 'rgba(255,230,170,0.9)';
              ctx.fillRect(wx, wy, 3 + rand() * 3, 4 + rand() * 3);
            }
          }
        }
        // diya rows along roof edges
        if (rand() < 0.55) {
          for (let lx = x + 3; lx < x + bw - 3; lx += 7) {
            ctx.fillStyle = `rgba(255,${150 + Math.floor(rand() * 70)},60,0.95)`;
            ctx.fillRect(lx, top - 2, 2, 2);
          }
        }
        // fairy light curtains
        if (rand() < 0.15) {
          const cols = ['#ff4d4d', '#ffd84d', '#4dff88', '#4dc3ff', '#ff7af0'];
          for (let lx = x + 4; lx < x + bw - 4; lx += 6) {
            for (let ly = top + 4; ly < top + bh * 0.5; ly += 6) {
              if (rand() < 0.6) {
                ctx.fillStyle = cols[Math.floor(rand() * cols.length)];
                ctx.globalAlpha = 0.85;
                ctx.fillRect(lx, ly, 1.6, 1.6);
                ctx.globalAlpha = 1;
              }
            }
          }
        }
      }
      x += bw + rand() * 6;
    }
  };

  drawLayer(110, 120, '#140d14', true);
  drawLayer(40, 90, '#0b080c', true);

  const tex = toTexture(color);
  tex.wrapS = THREE.RepeatWrapping;
  return tex;
}

// --------------------------------------------------------------------------
// Haveli facade behind the courtyard: arched jharokha windows glowing warm,
// a carved doorway with a marigold toran. Returns map + emissiveMap.
// --------------------------------------------------------------------------
export function createHaveliFacade() {
  const w = 2048, h = 512;
  const rand = rng(41);
  const col = makeCanvas(w, h);
  const em = makeCanvas(w, h);
  const c = col.getContext('2d');
  const e = em.getContext('2d');

  // wall
  c.fillStyle = '#8f6446';
  c.fillRect(0, 0, w, h);
  blotches(c, w, h, 160, ['rgba(60,35,20,A)', 'rgba(220,180,140,A)'], rand, 20, 120, 0.12);
  e.fillStyle = '#000';
  e.fillRect(0, 0, w, h);

  // cornices
  const cornice = (y, hh) => {
    c.fillStyle = '#a77a55';
    c.fillRect(0, y, w, hh);
    c.fillStyle = 'rgba(0,0,0,0.35)';
    c.fillRect(0, y + hh, w, 4);
  };
  cornice(232, 16);
  cornice(40, 14);

  const arch = (ctx, x, y, ww, hh) => {
    ctx.beginPath();
    ctx.moveTo(x, y + hh);
    ctx.lineTo(x, y + ww * 0.5);
    // cusped mughal arch
    ctx.quadraticCurveTo(x, y, x + ww / 2, y - ww * 0.2);
    ctx.quadraticCurveTo(x + ww, y, x + ww, y + ww * 0.5);
    ctx.lineTo(x + ww, y + hh);
    ctx.closePath();
  };

  const windowAt = (x, y, ww, hh, lit) => {
    // frame
    c.fillStyle = '#5a3a24';
    arch(c, x - 6, y - 4, ww + 12, hh + 10);
    c.fill();
    // glass/jali glow
    const g = c.createLinearGradient(0, y, 0, y + hh);
    g.addColorStop(0, lit ? '#ffcf7a' : '#2a1a14');
    g.addColorStop(1, lit ? '#ff8a2a' : '#1a100c');
    c.fillStyle = g;
    arch(c, x, y, ww, hh);
    c.fill();
    if (lit) {
      e.fillStyle = g;
      arch(e, x, y, ww, hh);
      e.fill();
    }
    // jali lattice
    c.save();
    arch(c, x, y, ww, hh);
    c.clip();
    c.strokeStyle = 'rgba(70,40,20,0.75)';
    c.lineWidth = 2;
    for (let k = -hh; k < ww + hh; k += 10) {
      c.beginPath(); c.moveTo(x + k, y - 20); c.lineTo(x + k - hh - 20, y + hh); c.stroke();
      c.beginPath(); c.moveTo(x + k, y - 20); c.lineTo(x + k + hh + 20, y + hh); c.stroke();
    }
    c.restore();
    if (lit) {
      e.save();
      arch(e, x, y, ww, hh);
      e.clip();
      e.strokeStyle = 'rgba(0,0,0,0.65)';
      e.lineWidth = 2;
      for (let k = -hh; k < ww + hh; k += 10) {
        e.beginPath(); e.moveTo(x + k, y - 20); e.lineTo(x + k - hh - 20, y + hh); e.stroke();
        e.beginPath(); e.moveTo(x + k, y - 20); e.lineTo(x + k + hh + 20, y + hh); e.stroke();
      }
      e.restore();
    }
    // sill with diyas
    c.fillStyle = '#6b4630';
    c.fillRect(x - 10, y + hh + 6, ww + 20, 6);
    for (let k = 0; k < 3; k++) {
      const dx = x + (ww / 4) * (k + 1);
      e.fillStyle = '#ffb347';
      e.beginPath(); e.ellipse(dx, y + hh + 2, 2.5, 4, 0, 0, Math.PI * 2); e.fill();
      c.fillStyle = '#ffd38a';
      c.beginPath(); c.ellipse(dx, y + hh + 2, 2.5, 4, 0, 0, Math.PI * 2); c.fill();
    }
  };

  // upper storey windows
  for (let i = 0; i < 12; i++) {
    const x = 70 + i * 165;
    if (Math.abs(x + 30 - w / 2) < 140) continue;
    windowAt(x, 92, 60, 110, rand() < 0.85);
  }
  // lower storey windows
  for (let i = 0; i < 10; i++) {
    const x = 110 + i * 195;
    if (Math.abs(x + 35 - w / 2) < 240) continue;
    windowAt(x, 300, 70, 140, rand() < 0.75);
  }

  // grand doorway
  const dx = w / 2 - 110, dy = 270, dw = 220, dh = 242;
  c.fillStyle = '#4a2e1c';
  arch(c, dx - 18, dy - 12, dw + 36, dh + 12);
  c.fill();
  const dg = c.createLinearGradient(0, dy, 0, dy + dh);
  dg.addColorStop(0, '#ffcf80');
  dg.addColorStop(1, '#e0701e');
  c.fillStyle = dg;
  arch(c, dx, dy, dw, dh);
  c.fill();
  e.fillStyle = dg;
  arch(e, dx, dy, dw, dh);
  e.fill();
  // door leaves half open
  c.fillStyle = '#3a2214';
  c.fillRect(dx, dy + 70, 52, dh - 70);
  c.fillRect(dx + dw - 52, dy + 70, 52, dh - 70);
  e.fillStyle = '#000';
  e.fillRect(dx, dy + 70, 52, dh - 70);
  e.fillRect(dx + dw - 52, dy + 70, 52, dh - 70);

  // marigold toran over the doorway
  for (let k = 0; k < 26; k++) {
    const t = k / 25;
    const tx = dx - 30 + t * (dw + 60);
    const ty = dy - 30 + Math.sin(t * Math.PI) * 26;
    c.fillStyle = k % 2 ? '#f39a1a' : '#f6c21c';
    c.beginPath(); c.arc(tx, ty, 7, 0, Math.PI * 2); c.fill();
    if (k % 3 === 0) {
      c.fillStyle = '#2f6b2a';
      c.beginPath(); c.ellipse(tx, ty + 18, 5, 12, 0, 0, Math.PI * 2); c.fill();
    }
  }
  // hanging strands of marigold
  for (let s = 0; s < 6; s++) {
    const sx = dx - 20 + s * ((dw + 40) / 5);
    for (let k = 0; k < 6; k++) {
      c.fillStyle = k % 2 ? '#f39a1a' : '#f6c21c';
      c.beginPath(); c.arc(sx, dy - 12 + k * 13, 5.5, 0, Math.PI * 2); c.fill();
    }
  }

  // roofline diyas
  for (let x = 10; x < w; x += 26) {
    e.fillStyle = '#ffae3d';
    e.beginPath(); e.ellipse(x, 34, 3, 5, 0, 0, Math.PI * 2); e.fill();
    c.fillStyle = '#ffd38a';
    c.beginPath(); c.ellipse(x, 34, 3, 5, 0, 0, Math.PI * 2); c.fill();
  }

  grain(c, w, h, 22, rand);

  return {
    map: toTexture(col),
    emissiveMap: toTexture(em)
  };
}

// --------------------------------------------------------------------------
// Moon disc with soft maria
// --------------------------------------------------------------------------
export function createMoonTexture() {
  const s = 256;
  const rand = rng(51);
  const c = makeCanvas(s, s);
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,248,228,1)');
  g.addColorStop(0.42, 'rgba(250,238,210,1)');
  g.addColorStop(0.47, 'rgba(250,230,200,0.35)');
  g.addColorStop(0.7, 'rgba(255,220,170,0.08)');
  g.addColorStop(1, 'rgba(255,220,170,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  ctx.save();
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.43, 0, Math.PI * 2);
  ctx.clip();
  for (let i = 0; i < 14; i++) {
    const x = s / 2 + (rand() - 0.5) * s * 0.6;
    const y = s / 2 + (rand() - 0.5) * s * 0.6;
    const r = 8 + rand() * 30;
    const mg = ctx.createRadialGradient(x, y, 0, x, y, r);
    mg.addColorStop(0, 'rgba(170,160,150,0.35)');
    mg.addColorStop(1, 'rgba(170,160,150,0)');
    ctx.fillStyle = mg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Vertical fade used by laser beams
export function createBeamTexture() {
  const c = makeCanvas(4, 256);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 256, 0, 0);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}
