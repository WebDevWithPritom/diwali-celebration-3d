import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { audio } from './audio.js';
import { createFlame, flameUniforms } from './flame.js';
import {
  createSandstoneTiles, createSandstone, createRangoli, createWaterNormals,
  createSkyline, createHaveliFacade, createMoonTexture, createBeamTexture, createTerracotta
} from './textures.js';

// ==========================================================================
// THE SCENE: a lamp-lit haveli courtyard above a river ghat on Diwali night
// ==========================================================================

const BASE = import.meta.env.BASE_URL;
const isSmall = window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 760;

const ATMOSPHERES = {
  midnight: {
    top: 0x020309, mid: 0x0a0f2a, horizon: 0x2b1a2a, glow: 0x5a2a12, fog: 0x120d16,
    hemiSky: 0x2a3866, hemiGround: 0x2a1408, hemi: 0.55, moon: 0.5, exposure: 1.0, stars: 1
  },
  twilight: {
    top: 0x0b1036, mid: 0x3b2b6c, horizon: 0xc0566a, glow: 0xff8a4a, fog: 0x3a2440,
    hemiSky: 0x7a6aa8, hemiGround: 0x3a1c14, hemi: 0.9, moon: 0.7, exposure: 1.02, stars: 0.35
  },
  golden: {
    top: 0x120904, mid: 0x3a1c08, horizon: 0xa8521a, glow: 0xffaa44, fog: 0x2a1408,
    hemiSky: 0x8a5a2a, hemiGround: 0x3a1a08, hemi: 0.8, moon: 0.45, exposure: 1.0, stars: 0.5
  }
};

export class DiwaliScene {
  constructor(container) {
    this.container = container;
    this.sweetMeshes = [];
    this.laserBeams = [];
    this.isLaserActive = false;
    this.laserLevel = 0;
    this.laserTimer = null;
    this.isAartiActive = false;
    this.aartiTime = 0;
    this.motion = 1;
    this.elapsed = 0;
    this.flames = [];
    this.onAartiStart = null;

    this.atmo = {};
    this.atmoTarget = ATMOSPHERES.midnight;

    this.init();
  }

  init() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(ATMOSPHERES.midnight.fog, 0.0105);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 16, 28);
    this.camera.lookAt(0, 2, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmall ? 1.5 : 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.domElement.setAttribute('aria-label', 'Interactive 3D Diwali courtyard');
    this.container.appendChild(this.renderer.domElement);

    // Warm, dim environment so brass and oil catch soft reflections
    this.setupEnvironment();
    this.setupLighting();
    this.setupSky();
    this.setupCourtyard();
    this.setupHaveli();
    this.setupPillars();
    this.setupGarlands();
    this.setupWater();
    this.setupAartiThali();
    this.setupMithaiThali();
    this.setupLaserBeams();
    this.setupBlenderModel();
    this.setupPostprocessing();

    this.setAtmosphere('midnight', true);
  }

  // ------------------------------------------------------------------------
  setupEnvironment() {
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x0a0710);
    const blob = (color, pos, s) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(s, 16, 8), new THREE.MeshBasicMaterial({ color }));
      m.position.copy(pos);
      envScene.add(m);
    };
    blob(0xffa04a, new THREE.Vector3(0, 1, 6), 2.5);
    blob(0xff8a30, new THREE.Vector3(-6, 0.5, -4), 2);
    blob(0xffc070, new THREE.Vector3(5, 3, -5), 1.6);
    blob(0x3a4a8a, new THREE.Vector3(0, 10, 0), 4);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(envScene, 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    pmrem.dispose();
  }

  setupLighting() {
    this.hemi = new THREE.HemisphereLight(0x2a3866, 0x2a1408, 0.55);
    this.scene.add(this.hemi);

    this.moonLight = new THREE.DirectionalLight(0xaebfff, 0.5);
    this.moonLight.position.set(-40, 60, -60);
    this.scene.add(this.moonLight);
  }

  // ------------------------------------------------------------------------
  // Sky dome, stars, moon and the distant town
  // ------------------------------------------------------------------------
  setupSky() {
    this.skyUniforms = {
      uTop: { value: new THREE.Color() },
      uMid: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() }
    };
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(600, 32, 16),
      new THREE.ShaderMaterial({
        uniforms: this.skyUniforms,
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: /* glsl */ `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            gl_Position = p.xyww;
          }`,
        fragmentShader: /* glsl */ `
          uniform vec3 uTop; uniform vec3 uMid; uniform vec3 uHorizon; uniform vec3 uGlow;
          varying vec3 vDir;
          void main() {
            float h = vDir.y;
            vec3 c = mix(uHorizon, uMid, smoothstep(-0.02, 0.22, h));
            c = mix(c, uTop, smoothstep(0.22, 0.85, h));
            c += uGlow * exp(-max(h, 0.0) * 16.0) * 0.55;
            if (h < 0.0) c = mix(uHorizon, uHorizon * 0.4, smoothstep(0.0, -0.2, h));
            gl_FragColor = vec4(c, 1.0);
          }`
      })
    );
    sky.renderOrder = -10;
    this.sky = sky;
    this.scene.add(sky);

    // twinkling stars
    const n = isSmall ? 1200 : 2200;
    const pos = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    const size = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2;
      const y = 0.08 + Math.pow(Math.random(), 0.7) * 0.92;
      const r = Math.sqrt(1 - y * y);
      pos[i * 3] = Math.cos(th) * r * 500;
      pos[i * 3 + 1] = y * 500;
      pos[i * 3 + 2] = Math.sin(th) * r * 500;
      phase[i] = Math.random() * 100;
      size[i] = Math.random() < 0.04 ? 3.2 : 1 + Math.random() * 1.4;
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sg.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    sg.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    this.starUniforms = { uTime: { value: 0 }, uAlpha: { value: 1 }, uMotion: flameUniforms.uMotion, uPixel: { value: this.renderer.getPixelRatio() } };
    this.stars = new THREE.Points(sg, new THREE.ShaderMaterial({
      uniforms: this.starUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        attribute float aPhase; attribute float aSize;
        uniform float uTime; uniform float uMotion; uniform float uPixel;
        varying float vTw;
        void main() {
          vTw = 0.65 + 0.35 * sin(uTime * (1.2 + fract(aPhase) * 2.0) + aPhase) * uMotion;
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
          gl_PointSize = aSize * uPixel;
        }`,
      fragmentShader: /* glsl */ `
        uniform float uAlpha; varying float vTw;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d) * vTw * uAlpha;
          gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * a, a);
        }`
    }));
    this.stars.renderOrder = -9;
    this.stars.frustumCulled = false;
    this.scene.add(this.stars);

    // moon
    const moon = new THREE.Sprite(new THREE.SpriteMaterial({
      map: createMoonTexture(), transparent: true, depthWrite: false, fog: false, color: 0xfff1d6
    }));
    moon.position.set(-170, 150, -330);
    moon.scale.setScalar(46);
    moon.renderOrder = -8;
    this.moon = moon;
    this.scene.add(moon);

    // the town across the river, wrapped around the horizon
    const skyTex = createSkyline();
    skyTex.repeat.set(3, 1);
    const town = new THREE.Mesh(
      new THREE.CylinderGeometry(300, 300, 64, 64, 1, true),
      new THREE.MeshBasicMaterial({ map: skyTex, transparent: true, alphaTest: 0.05, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    town.position.y = 26;
    town.renderOrder = -7;
    this.scene.add(town);
  }

  // ------------------------------------------------------------------------
  // Courtyard floor, rangoli, ghat steps
  // ------------------------------------------------------------------------
  setupCourtyard() {
    const tiles = createSandstoneTiles([6, 4.3]);
    const floorMat = new THREE.MeshStandardMaterial({
      map: tiles.map, bumpMap: tiles.bumpMap, bumpScale: 1.2, roughness: 0.82, metalness: 0
    });
    const ground = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 26), floorMat);
    ground.position.set(0, -0.3, -4);
    this.scene.add(ground);
    this.ground = ground;

    const rangoli = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({
        map: createRangoli(), transparent: true, roughness: 0.95, metalness: 0,
        polygonOffset: true, polygonOffsetFactor: -1
      })
    );
    rangoli.rotation.x = -Math.PI / 2;
    rangoli.position.set(0, 0.005, -4);
    this.scene.add(rangoli);

    // scattered marigold petals around the rangoli
    const petalGeom = new THREE.CircleGeometry(0.07, 6).rotateX(-Math.PI / 2);
    const petalMat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide });
    const petals = new THREE.InstancedMesh(petalGeom, petalMat, 260);
    const m = new THREE.Matrix4();
    const c = new THREE.Color();
    for (let i = 0; i < 260; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 6.2 + Math.random() * 1.4;
      m.makeRotationY(Math.random() * 6.28);
      m.setPosition(Math.cos(a) * r, 0.012, -4 + Math.sin(a) * r);
      petals.setMatrixAt(i, m);
      petals.setColorAt(i, c.setHex(Math.random() < 0.6 ? 0xf08a12 : Math.random() < 0.5 ? 0xf6c21c : 0xc2183a));
    }
    this.scene.add(petals);

    // ghat steps descending into the river
    const stoneMat = new THREE.MeshStandardMaterial({ map: createSandstone([6, 0.4]), roughness: 0.85 });
    for (let i = 0; i < 4; i++) {
      const step = new THREE.Mesh(new THREE.BoxGeometry(36, 0.6, 2.2), stoneMat);
      step.position.set(0, -0.3 - i * 0.6 - 0.6, 10.1 + i * 2.2);
      this.scene.add(step);
    }
    // retaining walls on either side of the ghat
    const wallMat = new THREE.MeshStandardMaterial({ map: createSandstone([1, 2], [150, 108, 78]), roughness: 0.9 });
    [-18.6, 18.6].forEach((x) => {
      const w = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, 37), wallMat);
      w.position.set(x, -1, 1.5);
      this.scene.add(w);
    });

    // plinth for the panch-pradip lamp
    const plinthMat = new THREE.MeshStandardMaterial({ map: createSandstone([1, 1], [182, 140, 104]), roughness: 0.8 });
    const p1 = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.3, 3.6), plinthMat);
    p1.position.set(0, 0.15, -11);
    const p2 = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), plinthMat);
    p2.position.set(0, 0.45, -11);
    this.scene.add(p1, p2);
  }

  setupHaveli() {
    const tex = createHaveliFacade();
    const mat = new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 0.75, roughness: 0.9
    });
    const facade = new THREE.Mesh(new THREE.PlaneGeometry(44, 11), mat);
    facade.position.set(0, 5.5, -17.2);
    this.scene.add(facade);

    const capMat = new THREE.MeshStandardMaterial({ map: createSandstone([8, 0.5], [160, 116, 84]), roughness: 0.85 });
    const parapet = new THREE.Mesh(new THREE.BoxGeometry(45, 0.6, 1.2), capMat);
    parapet.position.set(0, 11.2, -17.3);
    const back = new THREE.Mesh(new THREE.BoxGeometry(45, 11, 0.4), capMat);
    back.position.set(0, 5.5, -17.6);
    this.scene.add(parapet, back);

    // warm light spilling out of the doorway onto the courtyard
    this.doorLight = new THREE.PointLight(0xff9a40, 16, 26, 1.8);
    this.doorLight.position.set(0, 2.6, -15.8);
    this.scene.add(this.doorLight);
  }

  setupPillars() {
    const prof = [
      [0, 0], [1.0, 0], [1.0, 0.45], [0.82, 0.55], [0.72, 0.8], [0.62, 0.95], [0.52, 1.1],
      [0.5, 5.6], [0.6, 5.75], [0.62, 5.9], [0.82, 6.15], [0.98, 6.45], [0.98, 6.7], [0, 6.7]
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const geom = new THREE.LatheGeometry(prof, 48);
    // fluting on the shaft
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > 1.15 && y < 5.55) {
        const x = pos.getX(i), z = pos.getZ(i);
        const th = Math.atan2(z, x);
        const k = 1 + 0.045 * Math.cos(th * 16);
        pos.setX(i, x * k);
        pos.setZ(i, z * k);
      }
    }
    geom.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: createSandstone([3, 1.5], [176, 132, 96]), roughness: 0.8 });

    const bowlGeom = new THREE.LatheGeometry(
      [[0, 0], [0.3, 0], [0.5, 0.18], [0.55, 0.3], [0.5, 0.3], [0.3, 0.16], [0, 0.14]].map(([x, y]) => new THREE.Vector2(x, y)), 24);
    bowlGeom.computeVertexNormals();
    const clay = new THREE.MeshStandardMaterial({ map: createTerracotta(false, 8), roughness: 0.9 });

    this.pillarTops = [];
    [[-16, -15], [16, -15], [-16, 7], [16, 7]].forEach(([x, z]) => {
      const pillar = new THREE.Mesh(geom, mat);
      pillar.position.set(x, 0, z);
      this.scene.add(pillar);

      const bowl = new THREE.Mesh(bowlGeom, clay);
      bowl.position.set(x, 6.7, z);
      this.scene.add(bowl);
      const flame = createFlame({ width: 0.28, height: 0.7, halo: 2.4, seed: Math.random() * 50 });
      flame.position.set(x, 6.92, z);
      this.scene.add(flame);
      this.flames.push(flame);

      const light = new THREE.PointLight(0xffa04a, 22, 26, 1.8);
      light.position.set(x, 7.5, z);
      this.scene.add(light);
      this.pillarTops.push(new THREE.Vector3(x, 6.25, z));
    });
  }

  // Marigold garlands and warm string lights hung between the pillars
  setupGarlands() {
    const spans = [];
    const A = (x, z) => new THREE.Vector3(x, 6.1, z);
    for (let s = 0; s < 4; s++) spans.push([A(-16 + s * 8, -15), A(-16 + (s + 1) * 8, -15)]);
    for (const x of [-16, 16]) {
      const zs = [-15, -7.7, -0.3, 7];
      for (let s = 0; s < 3; s++) spans.push([A(x, zs[s]), A(x, zs[s + 1])]);
    }

    const flowers = [];
    const bulbs = [];
    spans.forEach(([a, b]) => {
      const len = a.distanceTo(b);
      const sag = len * 0.16;
      const nF = Math.round(len * 7);
      for (let i = 0; i <= nF; i++) {
        const t = i / nF;
        const p = a.clone().lerp(b, t);
        p.y -= sag * 4 * t * (1 - t);
        flowers.push(p);
      }
      const nB = Math.round(len * 1.6);
      for (let i = 0; i <= nB; i++) {
        const t = i / nB;
        const p = a.clone().lerp(b, t);
        p.y -= sag * 1.3 * 4 * t * (1 - t) + 0.25;
        bulbs.push(p);
      }
    });

    const fGeom = new THREE.IcosahedronGeometry(0.15, 1);
    const fMat = new THREE.MeshStandardMaterial({ roughness: 0.75, flatShading: true });
    const fl = new THREE.InstancedMesh(fGeom, fMat, flowers.length);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    flowers.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, 0));
      sc.set(1, 0.8, 1).multiplyScalar(0.85 + Math.random() * 0.3);
      m.compose(p, q, sc);
      fl.setMatrixAt(i, m);
      fl.setColorAt(i, col.setHex(i % 9 < 5 ? 0xf08410 : 0xf7bd1a));
    });
    this.scene.add(fl);

    // bulbs: warm whites with a few coloured ones, bright enough to bloom
    const bGeom = new THREE.SphereGeometry(0.055, 8, 6);
    const bMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: true });
    this.bulbs = new THREE.InstancedMesh(bGeom, bMat, bulbs.length);
    this.bulbBase = [];
    const palette = [[3.2, 2.0, 0.9], [3.2, 2.0, 0.9], [3.2, 1.2, 0.5], [3.0, 0.6, 0.5], [2.6, 2.6, 1.6]];
    bulbs.forEach((p, i) => {
      m.makeTranslation(p.x, p.y, p.z);
      this.bulbs.setMatrixAt(i, m);
      const c = palette[i % palette.length];
      this.bulbBase.push(c);
      this.bulbs.setColorAt(i, col.setRGB(c[0], c[1], c[2]));
    });
    this.scene.add(this.bulbs);
  }

  // ------------------------------------------------------------------------
  setupWater() {
    // ends just short of the skyline ring so it never hides the far town
    const geom = new THREE.PlaneGeometry(520, 280);
    this.water = new Water(geom, {
      textureWidth: isSmall ? 256 : 512,
      textureHeight: isSmall ? 256 : 512,
      waterNormals: createWaterNormals(),
      sunDirection: new THREE.Vector3(-0.4, 0.6, -0.7).normalize(),
      sunColor: 0x8a7a6a,
      waterColor: 0x02121c,
      distortionScale: 1.6,
      fog: true,
      alpha: 1
    });
    this.water.material.uniforms.size.value = 1.6;
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.set(0, -2.36, 150);
    this.scene.add(this.water);
  }

  // ------------------------------------------------------------------------
  setupAartiThali() {
    const group = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.26 });

    const plate = new THREE.Mesh(new THREE.LatheGeometry(
      [[0, 0], [1.3, 0], [1.45, 0.06], [1.6, 0.14], [1.62, 0.17], [1.5, 0.12], [1.3, 0.05], [0, 0.04]]
        .map(([x, y]) => new THREE.Vector2(x, y)), 64), brass);
    plate.geometry.computeVertexNormals();
    group.add(plate);

    // five small brass lamps
    const cupGeom = new THREE.LatheGeometry(
      [[0, 0], [0.08, 0], [0.1, 0.08], [0.2, 0.16], [0.22, 0.2], [0.18, 0.18], [0, 0.15]]
        .map(([x, y]) => new THREE.Vector2(x, y)), 24);
    cupGeom.computeVertexNormals();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const cup = new THREE.Mesh(cupGeom, brass);
      cup.position.set(Math.cos(a) * 0.95, 0.05, Math.sin(a) * 0.95);
      group.add(cup);
      const f = createFlame({ width: 0.12, height: 0.32, halo: 0.7, seed: i * 7.3 });
      f.position.set(Math.cos(a) * 0.95, 0.24, Math.sin(a) * 0.95);
      group.add(f);
      this.flames.push(f);
    }

    // kumkum and haldi bowls
    const bowlGeom = new THREE.SphereGeometry(0.2, 20, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
    [[0x9e1a12, -0.25], [0xe7a91a, 0.25]].forEach(([c, x]) => {
      const bowl = new THREE.Mesh(bowlGeom, brass);
      bowl.rotation.x = Math.PI;
      bowl.position.set(x, 0.22, 0);
      const powder = new THREE.Mesh(new THREE.CircleGeometry(0.18, 20).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
      powder.position.set(x, 0.2, 0);
      group.add(bowl, powder);
    });

    // marigold heads
    const mg = new THREE.IcosahedronGeometry(0.11, 1);
    const mgMat = new THREE.MeshStandardMaterial({ color: 0xf08410, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.45 + Math.random() * 0.25;
      const f = new THREE.Mesh(mg, mgMat);
      f.scale.y = 0.65;
      f.position.set(Math.cos(a) * r, 0.12, Math.sin(a) * r);
      group.add(f);
    }

    this.thaliLight = new THREE.PointLight(0xffa04a, 3, 10, 2);
    this.thaliLight.position.set(0, 0.9, 0);
    group.add(this.thaliLight);

    group.position.set(-6, 0.02, -2);
    group.scale.setScalar(0.95);
    this.scene.add(group);
    this.aartiThali = group;
    this.aartiHome = group.position.clone();
  }

  setupMithaiThali() {
    const group = new THREE.Group();
    const silver = new THREE.MeshStandardMaterial({ color: 0xd8d8de, metalness: 1, roughness: 0.22 });
    const plate = new THREE.Mesh(new THREE.LatheGeometry(
      [[0, 0], [1.25, 0], [1.4, 0.07], [1.45, 0.12], [1.35, 0.09], [0, 0.04]]
        .map(([x, y]) => new THREE.Vector2(x, y)), 64), silver);
    plate.geometry.computeVertexNormals();
    group.add(plate);

    // kaju katli: diamonds with silver varak
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.2); shape.lineTo(0.3, 0); shape.lineTo(0, -0.2); shape.lineTo(-0.3, 0); shape.closePath();
    const kajuGeom = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 });
    kajuGeom.rotateX(-Math.PI / 2);
    const kajuMat = new THREE.MeshStandardMaterial({ color: 0xeee2c8, roughness: 0.4, metalness: 0.35 });
    for (let i = 0; i < 7; i++) {
      const k = new THREE.Mesh(kajuGeom, kajuMat);
      const a = (i / 7) * Math.PI * 2;
      k.position.set(Math.cos(a) * 0.85, 0.06, Math.sin(a) * 0.85);
      k.rotation.y = -a;
      k.userData.name = 'Kaju Katli';
      group.add(k);
      this.sweetMeshes.push(k);
    }

    // motichoor laddoos: bumpy boondi spheres stacked in the centre
    const ladGeom = new THREE.IcosahedronGeometry(0.19, 3);
    const lp = ladGeom.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < lp.count; i++) {
      v.fromBufferAttribute(lp, i);
      v.multiplyScalar(1 + (Math.sin(v.x * 90) * Math.sin(v.y * 87) * Math.sin(v.z * 93)) * 0.05);
      lp.setXYZ(i, v.x, v.y, v.z);
    }
    ladGeom.computeVertexNormals();
    const ladMat = new THREE.MeshStandardMaterial({ color: 0xf0861c, roughness: 0.75 });
    [[0, 0.2, 0], [0.34, 0.2, 0.1], [-0.3, 0.2, 0.18], [0.05, 0.2, -0.34], [0.02, 0.5, 0.0]].forEach((p) => {
      const l = new THREE.Mesh(ladGeom, ladMat);
      l.position.set(p[0], p[1], p[2]);
      l.userData.name = 'Motichoor Laddoo';
      group.add(l);
      this.sweetMeshes.push(l);
    });

    group.position.set(6, 0.02, -2);
    this.scene.add(group);
  }

  // ------------------------------------------------------------------------
  setupLaserBeams() {
    this.laserGroup = new THREE.Group();
    const colors = [0x00ffd0, 0xff2a7a, 0xffc040, 0x40ff80, 0xb060ff, 0xff8a20];
    const geom = new THREE.CylinderGeometry(0.7, 0.04, 160, 12, 1, true);
    geom.translate(0, 80, 0);
    const tex = createBeamTexture();
    colors.forEach((c, i) => {
      const mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(c), alphaMap: tex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false
      });
      const beam = new THREE.Mesh(geom, mat);
      beam.position.set(-20 + i * 8, 0, -22);
      beam.visible = false;
      this.laserGroup.add(beam);
      this.laserBeams.push({ mesh: beam, phase: i * 1.1, speed: 0.6 + i * 0.12 });
    });
    this.scene.add(this.laserGroup);
  }

  triggerLaserShow(duration = 8000) {
    this.isLaserActive = true;
    clearTimeout(this.laserTimer);
    this.laserTimer = setTimeout(() => { this.isLaserActive = false; }, duration);
  }

  toggleLaserShow() {
    clearTimeout(this.laserTimer);
    this.isLaserActive = !this.isLaserActive;
    return this.isLaserActive;
  }

  performMahaAarti() {
    if (this.isAartiActive) return false;
    this.isAartiActive = true;
    this.aartiTime = 0;
    audio.playRealAarti();
    if (this.onAartiStart) this.onAartiStart();
    setTimeout(() => {
      this.isAartiActive = false;
      this.aartiThali.position.copy(this.aartiHome);
      this.aartiThali.rotation.set(0, 0, 0);
    }, 9000);
    return true;
  }

  // ------------------------------------------------------------------------
  // The Blender model: only its brass panch-pradip lamp is used, on its own
  // plinth. Its Blender lights (exported at studio wattage) were blowing the
  // whole courtyard out to white, so they are stripped, and its static
  // flames are replaced with live ones.
  // ------------------------------------------------------------------------
  setupBlenderModel() {
    this.shrineLight = new THREE.PointLight(0xffa850, 0, 14, 1.8);
    this.shrineLight.position.set(0, 3.4, -11);
    this.scene.add(this.shrineLight);

    const loader = new GLTFLoader();
    loader.load(
      `${BASE}models/diwali_scene.glb`,
      (gltf) => {
        const model = gltf.scene;
        const brass = new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 1, roughness: 0.24 });
        const remove = [];
        const flameSpots = [];
        model.traverse((o) => {
          if (o === model) return;
          const name = o.name || '';
          if (o.isLight) remove.push(o);
          else if (/^Aarti_Flame/.test(name)) { flameSpots.push(o.position.clone()); remove.push(o); }
          else if (/^Aarti_Main_Light/.test(name)) remove.push(o);
          else if (/^Aarti_/.test(name)) { if (o.isMesh) o.material = brass; }
          else if (o.parent === model) remove.push(o);
        });
        remove.forEach((o) => o.parent && o.parent.remove(o));

        model.scale.setScalar(2.3);
        model.position.set(0, 0.6, -11);
        flameSpots.forEach((p, i) => {
          const f = createFlame({ width: 0.075, height: 0.2, halo: 0.55, seed: 20 + i * 3.1 });
          f.position.set(p.x, 0.93, p.z);
          model.add(f);
          this.flames.push(f);
        });
        this.scene.add(model);
        this.shrineLight.intensity = 5;
      },
      undefined,
      (err) => console.warn('Panch-pradip model could not be loaded:', err)
    );
  }

  // ------------------------------------------------------------------------
  setupPostprocessing() {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    const res = new THREE.Vector2(window.innerWidth, window.innerHeight).multiplyScalar(0.5);
    this.bloom = new UnrealBloomPass(res, 0.7, 0.5, 0.9);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  // ------------------------------------------------------------------------
  setAtmosphere(mode, instant = false) {
    this.atmoTarget = ATMOSPHERES[mode] || ATMOSPHERES.midnight;
    if (instant || this.motion < 0.5) this.applyAtmosphere(1);
    else this.atmoBlend = 0;
  }

  applyAtmosphere(k) {
    const t = this.atmoTarget;
    const lerpCol = (target, hex) => target.lerp(new THREE.Color(hex), k);
    lerpCol(this.skyUniforms.uTop.value, t.top);
    lerpCol(this.skyUniforms.uMid.value, t.mid);
    lerpCol(this.skyUniforms.uHorizon.value, t.horizon);
    lerpCol(this.skyUniforms.uGlow.value, t.glow);
    lerpCol(this.scene.fog.color, t.fog);
    lerpCol(this.hemi.color, t.hemiSky);
    lerpCol(this.hemi.groundColor, t.hemiGround);
    this.hemi.intensity += (t.hemi - this.hemi.intensity) * k;
    this.moonLight.intensity += (t.moon - this.moonLight.intensity) * k;
    this.renderer.toneMappingExposure += (t.exposure - this.renderer.toneMappingExposure) * k;
    this.starUniforms.uAlpha.value += (t.stars - this.starUniforms.uAlpha.value) * k;
  }

  setMotion(m) {
    this.motion = m;
    flameUniforms.uMotion.value = m;
  }

  update(delta, time) {
    this.elapsed = time;
    flameUniforms.uTime.value = time;
    this.starUniforms.uTime.value = time;
    this.water.material.uniforms.time.value += delta * 0.35;

    if (this.atmoBlend !== undefined && this.atmoBlend < 1) {
      this.atmoBlend = Math.min(1, this.atmoBlend + delta * 0.8);
      this.applyAtmosphere(Math.min(1, delta * 3));
      if (this.atmoBlend >= 1) this.applyAtmosphere(1);
    }

    for (const f of this.flames) f.userData.tick(time);

    // string lights shimmer softly
    if (this.motion > 0.5 && this.bulbs) {
      const c = new THREE.Color();
      for (let i = 0; i < this.bulbBase.length; i++) {
        const b = this.bulbBase[i];
        const k = 0.75 + 0.25 * Math.sin(time * 2.2 + i * 0.9);
        this.bulbs.setColorAt(i, c.setRGB(b[0] * k, b[1] * k, b[2] * k));
      }
      this.bulbs.instanceColor.needsUpdate = true;
    }

    // aarti: the thali is lifted and circled clockwise
    if (this.isAartiActive) {
      this.aartiTime += delta * 1.3;
      const r = 2.6;
      const a = -this.aartiTime;
      this.aartiThali.position.set(Math.cos(a) * r, 2.0 + Math.sin(this.aartiTime * 2) * 0.3, -4 + Math.sin(a) * r);
      this.aartiThali.rotation.z = Math.sin(this.aartiTime) * 0.12;
    }

    // laser show
    const target = this.isLaserActive ? 1 : 0;
    this.laserLevel += (target - this.laserLevel) * Math.min(1, delta * 3);
    const visible = this.laserLevel > 0.01;
    for (const b of this.laserBeams) {
      b.mesh.visible = visible;
      if (!visible) continue;
      b.mesh.material.opacity = 0.22 * this.laserLevel;
      const s = this.motion > 0.5 ? time * b.speed : 0;
      b.mesh.rotation.z = Math.sin(s + b.phase) * 0.4;
      // always lean away from the viewer so beams never slice across the lens
      b.mesh.rotation.x = -0.3 + Math.cos(s * 0.8 + b.phase) * 0.18;
    }
  }

  render() {
    this.composer.render();
  }

  onWindowResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    // narrow phones get a wider lens so the courtyard still fits
    this.camera.fov = this.camera.aspect < 0.8 ? 66 : this.camera.aspect < 1.2 ? 58 : 50;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    this.bloom.setSize(w * 0.5, h * 0.5);
    this.starUniforms.uPixel.value = this.renderer.getPixelRatio();
  }
}
