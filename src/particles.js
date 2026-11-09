import * as THREE from 'three';
import { audio } from './audio.js';
import { createTerracotta, createAnarWrap } from './textures.js';

// ==========================================================================
// FIREWORKS ENGINE
// One pooled, HDR point-sprite system drives every spark in the scene:
// rocket trails, shell bursts, anar fountains, chakris, the phuljhadi and
// light painting. Stars burn white-hot, cool through their colour to an
// ember red, glitter, leave trails and bounce off the stone floor.
// ==========================================================================

const F_HOT = 1;       // starts white-hot
const F_GLITTER = 2;   // twinkles as it burns out
const F_TRAIL = 4;     // sheds a trail of tiny sparks
const F_PAINT = 8;     // light-painting stroke (cleared by "Clear trail")
const F_BOUNCE = 16;   // skips off the floor
const F_CRACKLE = 32;  // pops into crackles when it dies
const F_BRANCH = 64;   // sparkler fork: splits once mid-life

const isSmall = typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760);
const CAPACITY = isSmall ? 9000 : 18000;
const DENSITY = isSmall ? 0.6 : 1;

const sparkVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = clamp(aSize * uScale / -mv.z, 1.0, 160.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const sparkFragment = /* glsl */ `
  uniform float uBoost;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r2 = dot(c, c) * 4.0;
    float core = exp(-r2 * 10.0);
    float halo = exp(-r2 * 2.6) * 0.32;
    float a = (core + halo) * vAlpha;
    if (a < 0.002) discard;
    gl_FragColor = vec4(vColor * uBoost * (core * 1.25 + halo), vAlpha);
  }
`;

const PALETTES = [
  { c0: [1.0, 0.18, 0.12], c1: [0.55, 0.05, 0.02] },  // sindoor red
  { c0: [1.0, 0.62, 0.12], c1: [0.7, 0.18, 0.02] },   // marigold
  { c0: [1.0, 0.85, 0.35], c1: [0.8, 0.35, 0.05] },   // lamp gold
  { c0: [0.25, 1.0, 0.45], c1: [0.05, 0.4, 0.1] },    // emerald
  { c0: [0.2, 0.6, 1.0], c1: [0.05, 0.15, 0.5] },     // peacock blue
  { c0: [0.95, 0.3, 0.75], c1: [0.45, 0.05, 0.3] },   // lotus pink
  { c0: [0.7, 0.4, 1.0], c1: [0.25, 0.08, 0.5] },     // violet
  { c0: [0.95, 0.95, 1.0], c1: [0.6, 0.55, 0.5] }     // silver
];

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rand = (a, b) => a + Math.random() * (b - a);

export class ParticleEngine {
  constructor(scene) {
    this.scene = scene;
    this.camera = null;
    this.motion = 1;

    this.rockets = [];
    this.fountains = [];
    this.spinners = [];
    this.crackleBudget = 0;

    this.initPool();
    this.initLightPool();

    // Sparkler (phuljhadi)
    this.sparklerActive = false;
    this.sparklerTip = new THREE.Vector3(0, 3, 4);
    this.sparklerHasTip = false;
    this.lastPaint = null;
    this.initSparklerWand();

    // Shared props
    this.potGeom = new THREE.LatheGeometry(
      [[0, 0], [0.42, 0], [0.46, 0.06], [0.44, 0.3], [0.34, 0.72], [0.18, 1.0], [0.1, 1.08], [0.06, 1.1], [0, 1.1]]
        .map(([x, y]) => new THREE.Vector2(x, y)), 28);
    this.potGeom.computeVertexNormals();
    this.potMat = new THREE.MeshStandardMaterial({ map: createTerracotta(false, 12), roughness: 0.9 });
    this.wrapGeom = new THREE.CylinderGeometry(0.405, 0.445, 0.34, 28, 1, true);
    this.wrapMat = new THREE.MeshStandardMaterial({ map: createAnarWrap(), roughness: 0.7, side: THREE.DoubleSide });

    const spiral = [];
    for (let i = 0; i <= 120; i++) {
      const t = i / 120;
      const a = t * Math.PI * 2 * 3.2;
      const r = 0.08 + t * 0.5;
      spiral.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    this.chakriGeom = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(spiral), 240, 0.045, 6, false);
  }

  setCamera(camera) {
    this.camera = camera;
  }

  setMotion(m) {
    this.motion = m;
  }

  // ------------------------------------------------------------------------
  // Pool
  // ------------------------------------------------------------------------
  initPool() {
    const n = CAPACITY;
    this.count = 0;
    this.pos = new Float32Array(n * 3);
    this.col = new Float32Array(n * 3);
    this.size = new Float32Array(n);
    this.alpha = new Float32Array(n);
    this.vel = new Float32Array(n * 3);
    this.life = new Float32Array(n);
    this.maxLife = new Float32Array(n);
    this.grav = new Float32Array(n);
    this.drag = new Float32Array(n);
    this.size0 = new Float32Array(n);
    this.c0 = new Float32Array(n * 3);
    this.c1 = new Float32Array(n * 3);
    this.flags = new Uint8Array(n);
    this.trailRate = new Float32Array(n);
    this.trailAcc = new Float32Array(n);

    const geom = new THREE.BufferGeometry();
    const mk = (arr, size) => {
      const a = new THREE.BufferAttribute(arr, size);
      a.setUsage(THREE.DynamicDrawUsage);
      return a;
    };
    geom.setAttribute('position', mk(this.pos, 3));
    geom.setAttribute('aColor', mk(this.col, 3));
    geom.setAttribute('aSize', mk(this.size, 1));
    geom.setAttribute('aAlpha', mk(this.alpha, 1));
    geom.setDrawRange(0, 0);

    this.sparkMaterial = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uBoost: { value: 1.15 } },
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(geom, this.sparkMaterial);
    this.points.frustumCulled = false;
    this.points.renderOrder = 20;
    this.scene.add(this.points);
  }

  // Called on resize so spark sizes are in world units
  setViewport(heightPx, fovDeg) {
    this.sparkMaterial.uniforms.uScale.value = heightPx / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg) / 2));
  }

  spawn(x, y, z, vx, vy, vz, life, size, c0, c1, grav, drag, flags = 0, trailRate = 0) {
    if (this.count >= CAPACITY) return -1;
    const i = this.count++;
    const i3 = i * 3;
    this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
    this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
    this.life[i] = life; this.maxLife[i] = life;
    this.size0[i] = size; this.size[i] = size;
    this.c0[i3] = c0[0]; this.c0[i3 + 1] = c0[1]; this.c0[i3 + 2] = c0[2];
    this.c1[i3] = c1[0]; this.c1[i3 + 1] = c1[1]; this.c1[i3 + 2] = c1[2];
    this.grav[i] = grav;
    this.drag[i] = drag;
    this.flags[i] = flags;
    this.trailRate[i] = trailRate;
    this.trailAcc[i] = Math.random();
    this.alpha[i] = 1;
    this.col[i3] = c0[0]; this.col[i3 + 1] = c0[1]; this.col[i3 + 2] = c0[2];
    return i;
  }

  kill(i) {
    const last = --this.count;
    if (i === last) return;
    const i3 = i * 3, l3 = last * 3;
    for (let k = 0; k < 3; k++) {
      this.pos[i3 + k] = this.pos[l3 + k];
      this.vel[i3 + k] = this.vel[l3 + k];
      this.c0[i3 + k] = this.c0[l3 + k];
      this.c1[i3 + k] = this.c1[l3 + k];
      this.col[i3 + k] = this.col[l3 + k];
    }
    this.life[i] = this.life[last];
    this.maxLife[i] = this.maxLife[last];
    this.size0[i] = this.size0[last];
    this.size[i] = this.size[last];
    this.alpha[i] = this.alpha[last];
    this.grav[i] = this.grav[last];
    this.drag[i] = this.drag[last];
    this.flags[i] = this.flags[last];
    this.trailRate[i] = this.trailRate[last];
    this.trailAcc[i] = this.trailAcc[last];
  }

  // ------------------------------------------------------------------------
  // Light pool: a fixed set of point lights shared by every effect, so the
  // shader never recompiles mid-show.
  // ------------------------------------------------------------------------
  initLightPool() {
    this.lights = [];
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0xffd27a, 0, 0, 1.4);
      light.position.set(0, -50, 0);
      this.scene.add(light);
      this.lights.push({ light, peak: 0, t: 0, held: false });
    }
  }

  borrowLight(color, position, peak, held = false) {
    let slot = this.lights.find((l) => l.light.intensity < 0.01 && !l.held);
    if (!slot) slot = this.lights.filter((l) => !l.held).sort((a, b) => a.light.intensity - b.light.intensity)[0];
    if (!slot) return null;
    slot.light.color.setHex(color);
    slot.light.position.copy(position);
    slot.peak = peak;
    slot.t = 0;
    slot.held = held;
    slot.light.intensity = peak;
    return slot;
  }

  releaseLight(slot) {
    if (!slot) return;
    slot.held = false;
    slot.peak = slot.light.intensity;
    slot.t = 0;
  }

  // ------------------------------------------------------------------------
  // SKY ROCKETS
  // ------------------------------------------------------------------------
  launchRocket(target, { silent = false, far = false } = {}) {
    const x = target ? target.x : rand(-12, 12);
    const z = target ? target.z : rand(-14, 4);
    if (!silent) audio.playRocketLaunch();
    const type = pick(['peony', 'peony', 'chrysanthemum', 'willow', 'ring', 'double', 'crackle']);
    this.rockets.push({
      pos: new THREE.Vector3(x, far ? -2 : 0.3, z),
      vel: new THREE.Vector3(rand(-1.2, 1.2), far ? rand(34, 40) : rand(27, 31), rand(-1.2, 1.2)),
      targetY: far ? rand(45, 70) : rand(30, 46),
      type,
      palette: pick(PALETTES),
      palette2: pick(PALETTES),
      silent,
      far,
      trailAcc: 0
    });
  }

  explodeRocket(r) {
    const p = r.pos;
    const d = DENSITY;
    const pal = r.palette;
    const camDist = this.camera ? this.camera.position.distanceTo(p) : 50;
    if (!r.silent) audio.playFireworkBurst(Math.min(0.6, camDist * 0.006), r.type === 'crackle');

    const lightColor = new THREE.Color(pal.c0[0], pal.c0[1], pal.c0[2]).lerp(new THREE.Color(1, 0.85, 0.6), 0.4);
    if (!r.far) this.borrowLight(lightColor.getHex(), p, 220);

    // initial flash
    this.spawn(p.x, p.y, p.z, 0, 0, 0, 0.12, r.far ? 5 : 8, [0.9, 0.8, 0.65], [0.6, 0.4, 0.2], 0, 0);

    const sphere = (n, speed, opts) => {
      for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const sp = speed * (0.9 + Math.random() * 0.12);
        this.spawn(p.x, p.y, p.z, s * Math.cos(th) * sp, u * sp, s * Math.sin(th) * sp,
          rand(opts.life[0], opts.life[1]), opts.size, opts.c0, opts.c1, opts.grav, opts.drag, opts.flags, opts.trail || 0);
      }
    };

    switch (r.type) {
      case 'chrysanthemum':
        sphere(Math.round(170 * d), 14, { life: [1.5, 2.1], size: 0.8, c0: pal.c0, c1: pal.c1, grav: -5, drag: 1.15, flags: F_HOT | F_TRAIL, trail: 38 });
        break;
      case 'willow':
        sphere(Math.round(190 * d), 9.5, { life: [3.0, 3.9], size: 0.7, c0: [1, 0.78, 0.38], c1: [0.55, 0.2, 0.04], grav: -3.6, drag: 1.5, flags: F_TRAIL | F_GLITTER, trail: 30 });
        break;
      case 'ring': {
        const axis = new THREE.Vector3(rand(-0.4, 0.4), 1, rand(-0.4, 0.4)).normalize();
        const a = new THREE.Vector3(1, 0, 0).cross(axis).normalize();
        const b = axis.clone().cross(a);
        const n = Math.round(110 * d);
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const sp = 14 * (0.97 + Math.random() * 0.06);
          const vx = (a.x * Math.cos(t) + b.x * Math.sin(t)) * sp;
          const vy = (a.y * Math.cos(t) + b.y * Math.sin(t)) * sp;
          const vz = (a.z * Math.cos(t) + b.z * Math.sin(t)) * sp;
          this.spawn(p.x, p.y, p.z, vx, vy, vz, rand(1.4, 1.8), 0.75, pal.c0, pal.c1, -4, 1.1, F_HOT);
        }
        sphere(Math.round(40 * d), 5, { life: [1, 1.4], size: 0.7, c0: [1, 0.85, 0.5], c1: [0.8, 0.3, 0.05], grav: -4, drag: 1.2, flags: F_GLITTER });
        break;
      }
      case 'double':
        sphere(Math.round(170 * d), 14.5, { life: [1.5, 2.0], size: 0.85, c0: pal.c0, c1: pal.c1, grav: -5, drag: 1.1, flags: F_HOT });
        sphere(Math.round(90 * d), 7, { life: [1.3, 1.7], size: 0.8, c0: r.palette2.c0, c1: r.palette2.c1, grav: -5, drag: 1.1, flags: F_HOT | F_GLITTER });
        break;
      case 'crackle':
        sphere(Math.round(150 * d), 12, { life: [1.0, 1.5], size: 0.75, c0: [1, 0.86, 0.5], c1: [0.9, 0.45, 0.1], grav: -6, drag: 1.2, flags: F_GLITTER | F_CRACKLE });
        break;
      default: // peony
        sphere(Math.round(260 * d), 14, { life: [1.5, 2.1], size: 0.7, c0: pal.c0, c1: pal.c1, grav: -5, drag: 1.15, flags: F_HOT | (Math.random() < 0.4 ? F_GLITTER : 0) });
    }
  }

  // ------------------------------------------------------------------------
  // ANAR (flowerpot)
  // ------------------------------------------------------------------------
  createAnarFountain(groundPos) {
    const x = groundPos ? groundPos.x : 0;
    const z = groundPos ? groundPos.z : 0;
    audio.playAnarFountain();

    const pot = new THREE.Group();
    const clay = new THREE.Mesh(this.potGeom, this.potMat);
    const wrap = new THREE.Mesh(this.wrapGeom, this.wrapMat);
    wrap.position.y = 0.32;
    pot.add(clay, wrap);
    pot.scale.setScalar(0.85);
    pot.position.set(x, 0, z);
    pot.rotation.y = Math.random() * Math.PI;
    this.scene.add(pot);

    const origin = new THREE.Vector3(x, 0.95, z);
    this.fountains.push({
      pot,
      origin,
      age: 0,
      duration: 5.2,
      acc: 0,
      light: this.borrowLight(0xffb04a, new THREE.Vector3(x, 2.2, z), 30, true)
    });
  }

  // ------------------------------------------------------------------------
  // CHAKRI (ground spinner)
  // ------------------------------------------------------------------------
  createChakriSpinner(groundPos) {
    const x = groundPos ? groundPos.x : 4;
    const z = groundPos ? groundPos.z : 4;
    audio.playChakriSpin();
    const green = Math.random() < 0.4;
    const mat = new THREE.MeshStandardMaterial({
      color: green ? 0x2a7a3a : 0xa12a1c,
      roughness: 0.6,
      emissive: 0xff8a2a,
      emissiveIntensity: 0
    });
    const disc = new THREE.Mesh(this.chakriGeom, mat);
    disc.position.set(x, 0.07, z);
    this.scene.add(disc);
    this.spinners.push({
      disc,
      mat,
      pos: new THREE.Vector3(x, 0.08, z),
      age: 0,
      duration: 4.6,
      angle: 0,
      spin: 0,
      acc: 0,
      green,
      light: this.borrowLight(green ? 0xb8ff7a : 0xffa040, new THREE.Vector3(x, 0.6, z), 22, true)
    });
  }

  // ------------------------------------------------------------------------
  // Small effects
  // ------------------------------------------------------------------------
  createIgnitionSpark(pos) {
    for (let i = 0; i < 26; i++) {
      this.spawn(pos.x, pos.y, pos.z, rand(-1.6, 1.6), rand(0.8, 3.2), rand(-1.6, 1.6),
        rand(0.25, 0.6), 0.22, [1, 0.85, 0.5], [1, 0.35, 0.05], -6, 2, F_HOT);
    }
  }

  createSnuffWisp(pos) {
    for (let i = 0; i < 10; i++) {
      this.spawn(pos.x, pos.y, pos.z, rand(-0.2, 0.2), rand(0.4, 0.9), rand(-0.2, 0.2),
        rand(0.4, 0.9), 0.14, [1, 0.45, 0.1], [0.3, 0.05, 0.01], 0.4, 1.5, 0);
    }
  }

  // ------------------------------------------------------------------------
  // SPARKLER (phuljhadi) + light painting
  // ------------------------------------------------------------------------
  initSparklerWand() {
    const geom = new THREE.CylinderGeometry(0.018, 0.018, 1.9, 6);
    geom.translate(0, -0.95, 0);
    this.wand = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x6b6b70, metalness: 0.8, roughness: 0.5 }));
    this.wand.visible = false;
    this.scene.add(this.wand);
    this.sparklerLight = new THREE.PointLight(0xffd9a0, 0, 0, 1.8);
    this.scene.add(this.sparklerLight);
  }

  setSparklerActive(active) {
    this.sparklerActive = active;
    this.sparklerHasTip = false;
    this.lastPaint = null;
    this.wand.visible = false;
    if (active) audio.startSparklerSound();
    else {
      audio.stopSparklerSound();
      this.sparklerLight.intensity = 0;
    }
  }

  updateSparklerTip(p) {
    if (!this.sparklerActive || !p) return;
    this.sparklerTip.copy(p);
    this.sparklerHasTip = true;
    this.sparklerLight.position.copy(p);

    // paint a ribbon of light along the path, spaced evenly
    if (this.lastPaint) {
      const dist = this.lastPaint.distanceTo(p);
      const steps = Math.min(40, Math.floor(dist / 0.09));
      for (let s = 1; s <= steps; s++) {
        const q = this.lastPaint.clone().lerp(p, s / steps);
        this.spawn(q.x, q.y, q.z, 0, 0, 0, 2.6, 0.38, [1, 0.82, 0.45], [1, 0.32, 0.06], 0, 0, F_PAINT);
      }
      if (steps > 0) this.lastPaint.copy(p);
    } else {
      this.lastPaint = p.clone();
    }
  }

  clearLightTrail() {
    for (let i = this.count - 1; i >= 0; i--) {
      if (this.flags[i] & F_PAINT) this.kill(i);
    }
  }

  // ------------------------------------------------------------------------
  // UPDATE
  // ------------------------------------------------------------------------
  update(dt) {
    // --- rockets ---
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.vel.y -= 9.8 * dt * 0.55;
      r.pos.addScaledVector(r.vel, dt);
      // burning head + trail of falling sparks
      this.spawn(r.pos.x, r.pos.y, r.pos.z, 0, 0, 0, 0.05, r.far ? 0.9 : 1.2, [1, 0.9, 0.7], [1, 0.6, 0.2], 0, 0);
      r.trailAcc += dt * (r.far ? 60 : 110) * DENSITY;
      while (r.trailAcc >= 1) {
        r.trailAcc -= 1;
        this.spawn(r.pos.x + rand(-0.05, 0.05), r.pos.y - 0.2, r.pos.z + rand(-0.05, 0.05),
          rand(-0.6, 0.6), rand(-3, -0.5), rand(-0.6, 0.6), rand(0.3, 0.8), 0.32,
          [1, 0.8, 0.45], [0.8, 0.25, 0.03], -7, 1.4, F_GLITTER);
      }
      if (r.pos.y >= r.targetY || r.vel.y <= 5) {
        this.explodeRocket(r);
        this.rockets.splice(i, 1);
      }
    }

    // --- anar fountains ---
    for (let i = this.fountains.length - 1; i >= 0; i--) {
      const f = this.fountains[i];
      f.age += dt;
      const t = f.age / f.duration;
      // rises, roars, then sputters out
      const env = t < 0.15 ? t / 0.15 : t < 0.75 ? 1 : Math.max(0, 1 - (t - 0.75) / 0.25);
      if (t < 1) {
        f.acc += dt * 420 * env * DENSITY;
        while (f.acc >= 1) {
          f.acc -= 1;
          const spread = rand(0, 0.3);
          const th = Math.random() * Math.PI * 2;
          const sp = rand(8, 14) * (0.55 + 0.45 * env);
          const silver = Math.random() < 0.25;
          this.spawn(f.origin.x, f.origin.y, f.origin.z,
            Math.cos(th) * spread * sp, sp, Math.sin(th) * spread * sp,
            rand(0.8, 1.5), silver ? 0.42 : 0.5,
            silver ? [1, 1, 1] : [1, 0.86, 0.5], silver ? [0.7, 0.7, 0.75] : [1, 0.32, 0.04],
            -11, 0.6, F_HOT | F_GLITTER | (Math.random() < 0.3 ? F_BOUNCE : 0));
        }
        if (f.light) f.light.light.intensity = 30 * env * (0.85 + Math.random() * 0.3);
      } else if (f.light) {
        this.releaseLight(f.light);
        f.light = null;
      }
      if (f.age > f.duration + 2.5) {
        this.scene.remove(f.pot);
        this.fountains.splice(i, 1);
      }
    }

    // --- chakris ---
    for (let i = this.spinners.length - 1; i >= 0; i--) {
      const s = this.spinners[i];
      s.age += dt;
      const t = s.age / s.duration;
      const env = t < 0.12 ? t / 0.12 : t < 0.8 ? 1 : Math.max(0, 1 - (t - 0.8) / 0.2);
      s.spin = 34 * env;
      s.angle += s.spin * dt;
      s.disc.rotation.y = -s.angle;
      s.mat.emissiveIntensity = 1.6 * env;
      // real chakris skitter about on the floor
      s.pos.x += Math.sin(s.age * 3.1) * dt * 0.25 * env;
      s.pos.z += Math.cos(s.age * 2.3) * dt * 0.25 * env;
      s.disc.position.x = s.pos.x;
      s.disc.position.z = s.pos.z;
      if (t < 1) {
        s.acc += dt * 520 * env * DENSITY;
        while (s.acc >= 1) {
          s.acc -= 1;
          const a = s.angle + (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.15, 0.15);
          const rx = Math.cos(a) * 0.55, rz = Math.sin(a) * 0.55;
          const sp = rand(5, 9);
          // tangential spray
          this.spawn(s.pos.x + rx, s.pos.y + 0.05, s.pos.z + rz,
            -Math.sin(a) * sp, rand(0.2, 1.6), Math.cos(a) * sp,
            rand(0.3, 0.6), 0.42,
            s.green ? [0.8, 1, 0.6] : [1, 0.9, 0.6], s.green ? [0.2, 0.7, 0.1] : [1, 0.35, 0.05],
            -9.8, 1.6, F_HOT | F_BOUNCE);
        }
        if (s.light) {
          s.light.light.position.set(s.pos.x, 0.6, s.pos.z);
          s.light.light.intensity = 22 * env * (0.85 + Math.random() * 0.3);
        }
      } else if (s.light) {
        this.releaseLight(s.light);
        s.light = null;
      }
      if (s.age > s.duration + 2) {
        this.scene.remove(s.disc);
        s.mat.dispose();
        this.spinners.splice(i, 1);
      }
    }

    // --- sparkler ---
    if (this.sparklerActive && this.sparklerHasTip) {
      const tip = this.sparklerTip;
      const n = Math.round(260 * dt * DENSITY * 1.5) + 1;
      for (let k = 0; k < n; k++) {
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const s = Math.sqrt(1 - u * u);
        const sp = rand(2.5, 5.5);
        this.spawn(tip.x, tip.y, tip.z, s * Math.cos(th) * sp, u * sp, s * Math.sin(th) * sp,
          rand(0.1, 0.28), 0.2, [1, 0.95, 0.8], [1, 0.55, 0.15], -4, 3, F_HOT | (Math.random() < 0.25 ? F_BRANCH : 0));
      }
      this.spawn(tip.x, tip.y, tip.z, 0, 0, 0, 0.05, 1.4, [1, 0.9, 0.7], [1, 0.7, 0.4], 0, 0);
      this.sparklerLight.intensity = 9 * (0.8 + Math.random() * 0.4);

      // the wire wand trails down towards the viewer's hand
      if (this.camera) {
        this.wand.visible = true;
        this.wand.position.copy(tip);
        const down = new THREE.Vector3(0.45, -1, 0.35).applyQuaternion(this.camera.quaternion).normalize();
        this.wand.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), down);
      }
    }

    // --- lights fade ---
    for (const l of this.lights) {
      if (l.held) continue;
      if (l.light.intensity > 0.01) {
        l.t += dt;
        l.light.intensity = l.peak * Math.exp(-l.t * 2.6);
      } else {
        l.light.intensity = 0;
      }
    }

    // --- integrate sparks ---
    this.crackleBudget = Math.min(6, this.crackleBudget + dt * 8);
    const motion = this.motion;
    let i = 0;
    while (i < this.count) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        const fl = this.flags[i];
        if (fl & F_CRACKLE) {
          const i3 = i * 3;
          const x = this.pos[i3], y = this.pos[i3 + 1], z = this.pos[i3 + 2];
          for (let k = 0; k < 3; k++) {
            this.spawn(x, y, z, rand(-2, 2), rand(-2, 2), rand(-2, 2), rand(0.05, 0.14), 0.7, [1, 1, 0.95], [1, 0.9, 0.7], 0, 4, 0);
          }
          if (this.crackleBudget >= 1 && Math.random() < 0.08) {
            this.crackleBudget -= 1;
            audio.playCrackle();
          }
        }
        this.kill(i);
        continue;
      }

      const i3 = i * 3;
      const fl = this.flags[i];
      const k = Math.exp(-this.drag[i] * dt);
      this.vel[i3] *= k;
      this.vel[i3 + 1] = this.vel[i3 + 1] * k + this.grav[i] * dt;
      this.vel[i3 + 2] *= k;
      this.pos[i3] += this.vel[i3] * dt;
      this.pos[i3 + 1] += this.vel[i3 + 1] * dt;
      this.pos[i3 + 2] += this.vel[i3 + 2] * dt;

      if ((fl & F_BOUNCE) && this.pos[i3 + 1] < 0.02 && this.vel[i3 + 1] < 0) {
        this.pos[i3 + 1] = 0.02;
        this.vel[i3 + 1] *= -0.32;
        this.vel[i3] *= 0.7;
        this.vel[i3 + 2] *= 0.7;
      }

      const t = 1 - this.life[i] / this.maxLife[i];

      // colour: white-hot -> star colour -> ember
      if ((fl & F_HOT) && t < 0.12) {
        const m = t / 0.12;
        this.col[i3] = 1 + (this.c0[i3] - 1) * m;
        this.col[i3 + 1] = 1 + (this.c0[i3 + 1] - 1) * m;
        this.col[i3 + 2] = 0.95 + (this.c0[i3 + 2] - 0.95) * m;
      } else {
        const m = Math.min(1, Math.max(0, (t - 0.25) / 0.75));
        const mm = m * m * (3 - 2 * m);
        this.col[i3] = this.c0[i3] + (this.c1[i3] - this.c0[i3]) * mm;
        this.col[i3 + 1] = this.c0[i3 + 1] + (this.c1[i3 + 1] - this.c0[i3 + 1]) * mm;
        this.col[i3 + 2] = this.c0[i3 + 2] + (this.c1[i3 + 2] - this.c0[i3 + 2]) * mm;
      }

      let a = Math.pow(1 - t, 1.25);
      if ((fl & F_GLITTER) && t > 0.35) a *= Math.random() < 0.5 * motion + (1 - motion) ? 1 : 0.12;
      if (fl & F_PAINT) a = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3;
      this.alpha[i] = a;
      this.size[i] = this.size0[i] * (1 - 0.45 * t);

      if (fl & F_TRAIL) {
        this.trailAcc[i] += dt * this.trailRate[i] * DENSITY;
        while (this.trailAcc[i] >= 1) {
          this.trailAcc[i] -= 1;
          const long = this.maxLife[i] > 2.5;
          this.spawn(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2],
            this.vel[i3] * 0.05, this.vel[i3 + 1] * 0.05 - 0.3, this.vel[i3 + 2] * 0.05,
            long ? rand(0.8, 1.4) : rand(0.3, 0.55), 0.34 * (1 - t * 0.5),
            [1, 0.75, 0.38], [0.6, 0.18, 0.03], long ? -1.6 : -2.5, 1.2, F_GLITTER);
        }
      }

      if ((fl & F_BRANCH) && t > 0.5) {
        this.flags[i] = fl & ~F_BRANCH;
        for (let b = 0; b < 3; b++) {
          this.spawn(this.pos[i3], this.pos[i3 + 1], this.pos[i3 + 2],
            this.vel[i3] * 0.4 + rand(-2.5, 2.5), this.vel[i3 + 1] * 0.4 + rand(-2.5, 2.5), this.vel[i3 + 2] * 0.4 + rand(-2.5, 2.5),
            rand(0.06, 0.14), 0.13, [1, 0.95, 0.8], [1, 0.6, 0.2], -3, 3, 0);
        }
      }
      i++;
    }

    const g = this.points.geometry;
    g.setDrawRange(0, this.count);
    const n = this.count;
    for (const [name, size] of [['position', 3], ['aColor', 3], ['aSize', 1], ['aAlpha', 1]]) {
      const attr = g.attributes[name];
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, Math.max(1, n * size));
      attr.needsUpdate = true;
    }
  }

  get activeSparks() {
    return this.count;
  }
}
