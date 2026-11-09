import * as THREE from 'three';
import { audio } from './audio.js';
import { createFlame } from './flame.js';
import { createTerracotta } from './textures.js';

// ==========================================================================
// DIYAS: wheel-thrown clay lamps with a pinched spout, oil, cotton wick and
// a living flame, plus floating lotus diyas on the ghat water.
// ==========================================================================

const MAX_FLOATING = 18;

// --- Shared geometry -------------------------------------------------------
function buildDiyaBowl() {
  const pts = [
    [0.0, 0.0], [0.2, 0.0], [0.25, 0.015], [0.265, 0.045], [0.245, 0.07],
    [0.31, 0.105], [0.43, 0.185], [0.52, 0.262], [0.565, 0.305], [0.56, 0.332],
    [0.535, 0.336], [0.5, 0.31], [0.43, 0.25], [0.32, 0.185], [0.17, 0.152], [0.0, 0.145]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const geom = new THREE.LatheGeometry(pts, 64);
  pinchSpout(geom);
  geom.computeVertexNormals();
  return geom;
}

// Pull the bowl out into a pouring lip along +X
function pinchSpout(geom, strength = 0.55) {
  const pos = geom.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const r = Math.hypot(v.x, v.z);
    if (r < 1e-4) continue;
    const theta = Math.atan2(v.z, v.x);
    const f = Math.pow(Math.max(Math.cos(theta), 0), 12);
    const hf = THREE.MathUtils.smoothstep(v.y, 0.08, 0.3);
    const k = 1 + strength * f * hf;
    v.x *= k;
    v.z *= 1 - 0.18 * f * hf;
    v.y += 0.05 * f * hf;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
}

function buildOil() {
  const g = new THREE.CircleGeometry(0.47, 40);
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const theta = Math.atan2(z, x);
    const f = Math.pow(Math.max(Math.cos(theta), 0), 12);
    pos.setX(i, x * (1 + 0.42 * f));
    pos.setZ(i, z * (1 - 0.15 * f));
  }
  g.translate(0, 0.285, 0);
  return g;
}

function buildWick() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.38, 0.285, 0),
    new THREE.Vector3(0.62, 0.32, 0),
    new THREE.Vector3(0.74, 0.37, 0),
    new THREE.Vector3(0.77, 0.405, 0)
  ]);
  return new THREE.TubeGeometry(curve, 12, 0.034, 6, false);
}

function buildPedestal() {
  const pts = [
    [0, 0], [0.42, 0], [0.44, 0.04], [0.3, 0.1], [0.16, 0.2], [0.12, 0.38],
    [0.16, 0.44], [0.3, 0.5], [0.32, 0.53], [0, 0.53]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.LatheGeometry(pts, 40);
  g.computeVertexNormals();
  return g;
}

function buildPetal() {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(0.22, 0.18, 0.2, 0.62, 0, 0.9);
  shape.bezierCurveTo(-0.2, 0.62, -0.22, 0.18, 0, 0);
  const g = new THREE.ShapeGeometry(shape, 12);
  // cup the petal upwards and give it a tip-to-base colour gradient
  const pos = g.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const base = new THREE.Color(0xfff1f4);
  const tip = new THREE.Color(0xe0457b);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, y * y * 0.55 + x * x * 1.2);
    c.copy(base).lerp(tip, Math.pow(y / 0.9, 1.6));
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.rotateX(-Math.PI / 2); // lay flat, pointing along -Z
  g.computeVertexNormals();
  return g;
}

export class DiyaManager {
  constructor(scene, particleEngine, { onChange } = {}) {
    this.scene = scene;
    this.particleEngine = particleEngine;
    this.onChange = onChange || (() => {});
    this.diyas = [];
    this.floatingDiyas = [];
    this.diyaMeshesForRaycast = [];

    this.geo = {
      bowl: buildDiyaBowl(),
      oil: buildOil(),
      wick: buildWick(),
      pedestal: buildPedestal(),
      petal: buildPetal(),
      pad: new THREE.CircleGeometry(1.1, 32, 0.25, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2),
      hit: new THREE.SphereGeometry(0.85, 8, 6)
    };

    this.mat = {
      clayPlain: new THREE.MeshStandardMaterial({ map: createTerracotta(false, 3), roughness: 0.88, metalness: 0 }),
      clayPainted: new THREE.MeshStandardMaterial({ map: createTerracotta(true, 4), roughness: 0.82, metalness: 0 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd8a441, roughness: 0.28, metalness: 1 }),
      oil: new THREE.MeshStandardMaterial({ color: 0x3d2207, roughness: 0.06, metalness: 0 }),
      wick: new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 1 }),
      wickBurnt: new THREE.MeshStandardMaterial({ color: 0x1d140c, roughness: 1 }),
      petal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide }),
      pad: new THREE.MeshStandardMaterial({ color: 0x1f4a22, roughness: 0.45, side: THREE.DoubleSide }),
      hit: new THREE.MeshBasicMaterial({ visible: false })
    };

    // One warm fill light that grows with every diya you light, so the
    // courtyard visibly brightens as the ritual progresses.
    this.courtyardLight = new THREE.PointLight(0xff9a3c, 0, 0, 1.6);
    this.courtyardLight.position.set(0, 2.4, -3);
    this.scene.add(this.courtyardLight);
    this.courtyardTarget = 0;

    this.setupCourtyardDiyas();
    this.setupInitialFloatingDiyas();
  }

  createDiyaModel({ brass = false, painted = false, light = false, pool = 2.6, hit = true } = {}) {
    const group = new THREE.Group();
    const bodyMat = brass ? this.mat.brass : painted ? this.mat.clayPainted : this.mat.clayPlain;

    let lift = 0;
    if (brass) {
      const ped = new THREE.Mesh(this.geo.pedestal, this.mat.brass);
      group.add(ped);
      lift = 0.5;
    }

    const bowl = new THREE.Mesh(this.geo.bowl, bodyMat);
    bowl.position.y = lift;
    group.add(bowl);

    const oil = new THREE.Mesh(this.geo.oil, this.mat.oil);
    oil.position.y = lift;
    group.add(oil);

    const wick = new THREE.Mesh(this.geo.wick, this.mat.wick);
    wick.position.y = lift;
    group.add(wick);

    const flame = createFlame({
      width: 0.24,
      height: 0.44,
      halo: 1.0,
      pool,
      poolOffset: -(0.405 + lift) + 0.015,
      seed: Math.random() * 100
    });
    flame.position.set(0.76, 0.37 + lift, 0);
    flame.userData.setIntensity(0);
    group.add(flame);

    let pointLight = null;
    if (light) {
      pointLight = new THREE.PointLight(0xffa046, 0, 9, 2);
      pointLight.position.set(0.78, 0.75 + lift, 0);
      group.add(pointLight);
    }

    if (hit) {
      const hitMesh = new THREE.Mesh(this.geo.hit, this.mat.hit);
      hitMesh.position.set(0.3, 0.3 + lift, 0);
      group.add(hitMesh);
    }

    group.userData = {
      isDiya: true,
      isLit: false,
      flame,
      wick,
      light: pointLight,
      lightPower: brass ? 7 : 4,
      level: 0,
      igniteT: 0
    };
    return group;
  }

  setupCourtyardDiyas() {
    const cfgs = [
      { x: 0, z: -4, brass: true, lit: true, light: true, rot: -Math.PI / 2 }, // eternal jyoti
      { x: 2.4, z: -4, painted: true }, { x: -2.4, z: -4, painted: true },
      { x: 0, z: -1.6, painted: true }, { x: 0, z: -6.4, painted: true },
      { x: -8, z: 2 }, { x: 8, z: 2 },
      { x: -12, z: -4 }, { x: 12, z: -4 },
      { x: -8, z: -10 }, { x: 8, z: -10 },
      { x: -5, z: 8.6 }, { x: 0, z: 8.6 }, { x: 5, z: 8.6 }
    ];

    cfgs.forEach((cfg, idx) => {
      const diya = this.createDiyaModel(cfg);
      diya.position.set(cfg.x, 0, cfg.z);
      // spouts point away from the centre, like a real arrangement
      diya.rotation.y = cfg.rot !== undefined ? cfg.rot : Math.atan2(cfg.x, cfg.z + 4) - Math.PI / 2;
      diya.scale.setScalar(cfg.brass ? 1.25 : 1.05);
      diya.userData.id = idx;
      this.scene.add(diya);
      this.diyas.push(diya);
      diya.traverse((child) => {
        if (child.isMesh && child !== diya.userData.flame.userData.flameMesh) {
          child.userData.diyaParent = diya;
          this.diyaMeshesForRaycast.push(child);
        }
      });
      if (cfg.lit) this.igniteDiya(diya, false, true);
    });
  }

  createFloatingLotusDiya(x, z) {
    const group = new THREE.Group();

    const pad = new THREE.Mesh(this.geo.pad, this.mat.pad);
    pad.position.y = -0.02;
    pad.rotation.y = Math.random() * Math.PI * 2;
    group.add(pad);

    for (let layer = 0; layer < 2; layer++) {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const petal = new THREE.Mesh(this.geo.petal, this.mat.petal);
        const a = (i / n) * Math.PI * 2 + layer * (Math.PI / n);
        petal.rotation.order = 'YXZ';
        petal.rotation.y = a;
        petal.rotation.x = layer ? 0.55 : 0.2; // inner petals stand more upright
        petal.scale.setScalar(layer ? 0.62 : 0.85);
        petal.position.y = layer * 0.06;
        group.add(petal);
      }
    }

    const diya = this.createDiyaModel({ painted: true, pool: 3.2, hit: false });
    diya.scale.setScalar(0.55);
    diya.position.y = 0.08;
    group.add(diya);

    group.position.set(x, -2.32, z);
    group.rotation.y = Math.random() * Math.PI * 2;
    group.userData = {
      driftSpeed: 0.25 + Math.random() * 0.35,
      bobOffset: Math.random() * 20,
      diya
    };
    this.igniteDiya(diya, false, true);

    this.scene.add(group);
    this.floatingDiyas.push(group);

    // keep the pond tidy and the frame rate steady
    if (this.floatingDiyas.length > MAX_FLOATING) {
      const old = this.floatingDiyas.shift();
      this.scene.remove(old);
    }
    return group;
  }

  setupInitialFloatingDiyas() {
    [[-15, 24], [-5, 30], [8, 27], [18, 34], [-22, 37], [3, 41], [12, 46], [-10, 48]]
      .forEach(([x, z]) => this.createFloatingLotusDiya(x, z));
  }

  igniteDiya(diya, playSound = true, instant = false) {
    if (!diya || diya.userData.isLit) return;
    const d = diya.userData;
    d.isLit = true;
    d.igniteT = instant ? 1 : 0;
    d.wick.material = this.mat.wickBurnt;
    if (instant) {
      d.level = 1;
      d.flame.userData.setIntensity(1);
    }

    if (playSound) {
      audio.playDiyaChime();
      const p = new THREE.Vector3();
      d.flame.getWorldPosition(p);
      this.particleEngine.createIgnitionSpark(p);
    }
    this.onChange();
  }

  extinguishDiya(diya) {
    if (!diya || !diya.userData.isLit) return;
    const d = diya.userData;
    d.isLit = false;
    d.level = 0;
    d.flame.userData.setIntensity(0);
    if (d.light) d.light.intensity = 0;
    d.wick.material = this.mat.wickBurnt;
    // a wisp of smoke-coloured embers when snuffed
    const p = new THREE.Vector3();
    d.flame.getWorldPosition(p);
    this.particleEngine.createSnuffWisp(p);
  }

  lightAll() {
    this.diyas.forEach((diya, i) => {
      setTimeout(() => this.igniteDiya(diya, i % 3 === 0), i * 110);
    });
  }

  resetAll() {
    this.diyas.forEach((diya, i) => {
      if (i !== 0) this.extinguishDiya(diya);
    });
    this.onChange();
  }

  getLitCount() {
    return this.diyas.filter((d) => d.userData.isLit).length;
  }

  getTotalCount() {
    return this.diyas.length;
  }

  update(delta, time) {
    const motion = this._motion ?? 1;
    let litPower = 0;

    for (const diya of this.diyas) {
      const d = diya.userData;
      if (!d.isLit) continue;
      if (d.igniteT < 1) {
        // the wick catches: a quick flare, then it settles
        d.igniteT = Math.min(1, d.igniteT + delta * 2.2);
        const t = d.igniteT;
        d.level = t < 0.35 ? (t / 0.35) * 1.5 : 1.5 - 0.5 * ((t - 0.35) / 0.65);
        d.flame.userData.setIntensity(d.level);
      }
      d.flame.userData.tick(time);
      if (d.light) {
        const n = Math.sin(time * 9.1 + diya.id) * 0.06 + Math.sin(time * 15.7) * 0.04;
        d.light.intensity = d.lightPower * d.level * (1 + n * motion);
      }
      litPower += d.level;
    }

    // courtyard fill light eases towards the number of lit lamps
    this.courtyardTarget = 1.5 + litPower * 1.5;
    this.courtyardLight.intensity += (this.courtyardTarget - this.courtyardLight.intensity) * Math.min(1, delta * 3);

    for (const f of this.floatingDiyas) {
      const u = f.userData;
      f.position.x += u.driftSpeed * delta;
      if (f.position.x > 55) f.position.x = -55;
      f.position.y = -2.32 + Math.sin(time * 1.6 + u.bobOffset) * 0.05 * motion;
      f.rotation.z = Math.sin(time * 1.2 + u.bobOffset) * 0.03 * motion;
      f.rotation.y += delta * 0.05;
      u.diya.userData.flame.userData.tick(time);
    }
  }

  setMotion(m) {
    this._motion = m;
  }
}
