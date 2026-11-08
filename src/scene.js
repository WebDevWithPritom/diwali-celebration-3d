import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { audio } from './audio.js';

// ==========================================================================
// 3D SCENE: RADIANT TEMPLE GHATS, WATER SAROVAR, ATMOSPHERE & LASER SHOW
// ==========================================================================

export class DiwaliScene {
  constructor(container) {
    this.container = container;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.waterMesh = null;
    this.waterClock = 0;
    this.starPoints = null;

    // Lights
    this.ambientLight = null;
    this.moonLight = null;
    this.warmRim = null;
    this.courtyardGlow = null;

    // Aarti Thali Group & Animation
    this.aartiThali = null;
    this.isAartiActive = false;
    this.aartiTime = 0;

    // Laser Beams Group (Ayodhya Laser Deepotsav)
    this.laserGroup = new THREE.Group();
    this.isLaserActive = false;
    this.laserBeams = [];

    // Interactive Sweets (Mithai) Meshes for Raycasting
    this.sweetMeshes = [];

    // Blender 3D Model Integration
    this.blenderGroup = new THREE.Group();
    this.isBlenderModelVisible = true;

    this.init();
  }

  init() {
    // 1. Scene - Bright, Rich Royal Festive Sky
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a0d38);
    this.scene.fog = new THREE.FogExp2(0x221045, 0.005);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 16, 28);
    this.camera.lookAt(0, 2, 0);

    // 3. Renderer - Optimized for ZERO LAG (1.0 Pixel Ratio)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1.0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;

    this.container.appendChild(this.renderer.domElement);

    // 4. Lights
    this.setupLighting();

    // 5. Architecture & Models
    this.setupStarfield();
    this.setupCourtyard();
    this.setupWaterGhat();
    this.setupDecorations();
    this.setupAartiThali();
    this.setupMithaiThali();
    this.setupLaserBeams();
    this.setupBlenderModel();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffdfa0, 1.8);
    this.scene.add(this.ambientLight);

    this.moonLight = new THREE.DirectionalLight(0xffeedd, 1.5);
    this.moonLight.position.set(20, 60, -30);
    this.scene.add(this.moonLight);

    this.warmRim = new THREE.DirectionalLight(0xff9900, 1.2);
    this.warmRim.position.set(-30, 25, 20);
    this.scene.add(this.warmRim);

    this.courtyardGlow = new THREE.PointLight(0xffb703, 2.5, 40);
    this.courtyardGlow.position.set(0, 4, -4);
    this.scene.add(this.courtyardGlow);
  }

  setAtmosphere(mode) {
    if (mode === 'twilight') {
      this.scene.background.setHex(0x38154e);
      this.scene.fog.color.setHex(0x42175c);
      this.ambientLight.color.setHex(0xffaa77);
      this.ambientLight.intensity = 2.2;
      this.moonLight.color.setHex(0xff9e79);
      this.moonLight.intensity = 1.6;
    } else if (mode === 'golden') {
      this.scene.background.setHex(0x2d1404);
      this.scene.fog.color.setHex(0x381b08);
      this.ambientLight.color.setHex(0xffbb33);
      this.ambientLight.intensity = 2.5;
      this.moonLight.color.setHex(0xffd700);
      this.moonLight.intensity = 1.8;
    } else { // midnight
      this.scene.background.setHex(0x1a0d38);
      this.scene.fog.color.setHex(0x221045);
      this.ambientLight.color.setHex(0xffdfa0);
      this.ambientLight.intensity = 1.8;
      this.moonLight.color.setHex(0xffeedd);
      this.moonLight.intensity = 1.5;
    }
  }

  setupStarfield() {
    const starCount = 800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 240 + Math.random() * 60;

      const sinPhi = Math.sin(phi);
      positions[i * 3] = r * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 12;
      positions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

      colors[i * 3] = 1.0;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.6;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    this.starPoints = new THREE.Points(geometry, material);
    this.scene.add(this.starPoints);
  }

  setupCourtyard() {
    const groundGeom = new THREE.BoxGeometry(36, 0.6, 26);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x422660,
      roughness: 0.6,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeom, groundMat);
    ground.position.set(0, -0.3, -4);
    this.scene.add(ground);

    const rangoliCanvas = this.generateRangoliTexture();
    const rangoliTex = new THREE.CanvasTexture(rangoliCanvas);
    const rangoliGeom = new THREE.PlaneGeometry(12, 12);
    const rangoliMat = new THREE.MeshStandardMaterial({
      map: rangoliTex,
      transparent: true,
      roughness: 0.4
    });
    const rangoliMesh = new THREE.Mesh(rangoliGeom, rangoliMat);
    rangoliMesh.rotation.x = -Math.PI / 2;
    rangoliMesh.position.set(0, 0.02, -4);
    this.scene.add(rangoliMesh);

    const stepMat = new THREE.MeshStandardMaterial({
      color: 0x331a4f,
      roughness: 0.7
    });

    const stepWidth = 36;
    const stepDepth = 2.2;
    const stepHeight = 0.6;
    const numSteps = 4;

    for (let i = 0; i < numSteps; i++) {
      const stepGeom = new THREE.BoxGeometry(stepWidth, stepHeight, stepDepth);
      const step = new THREE.Mesh(stepGeom, stepMat);
      step.position.set(0, -0.3 - (i * stepHeight), 9 + (i * stepDepth));
      this.scene.add(step);
    }
  }

  setupWaterGhat() {
    const waterGeom = new THREE.PlaneGeometry(120, 60, 32, 32);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x09335a,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.92
    });

    this.waterMesh = new THREE.Mesh(waterGeom, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.set(0, -2.4, 38);
    this.scene.add(this.waterMesh);
  }

  setupDecorations() {
    const pillarGeom = new THREE.CylinderGeometry(0.5, 0.6, 7, 12);
    const pillarCapGeom = new THREE.ConeGeometry(0.9, 1.2, 12);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x522e75,
      roughness: 0.6
    });

    const pillarPositions = [
      [-16, 3.5, -15],
      [16, 3.5, -15],
      [-16, 3.5, 7],
      [16, 3.5, 7]
    ];

    pillarPositions.forEach(pos => {
      const group = new THREE.Group();
      const col = new THREE.Mesh(pillarGeom, pillarMat);
      group.add(col);

      const cap = new THREE.Mesh(pillarCapGeom, pillarMat);
      cap.position.y = 3.9;
      group.add(cap);

      const lanternGeom = new THREE.OctahedronGeometry(0.5);
      const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
      const lantern = new THREE.Mesh(lanternGeom, lanternMat);
      lantern.position.set(0, 2.5, 0);
      group.add(lantern);

      const lanternLight = new THREE.PointLight(0xffaa00, 1.8, 16);
      lanternLight.position.set(0, 2.5, 0);
      group.add(lanternLight);

      group.position.set(pos[0], pos[1], pos[2]);
      this.scene.add(group);
    });
  }

  setupAartiThali() {
    const group = new THREE.Group();

    const plateGeom = new THREE.CylinderGeometry(1.6, 1.4, 0.12, 24);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2
    });
    const plate = new THREE.Mesh(plateGeom, brassMat);
    group.add(plate);

    const rimGeom = new THREE.TorusGeometry(1.58, 0.06, 6, 24);
    rimGeom.rotateX(Math.PI / 2);
    const rim = new THREE.Mesh(rimGeom, brassMat);
    rim.position.y = 0.06;
    group.add(rim);

    const flameMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const outerFlameMat = new THREE.MeshBasicMaterial({ color: 0xff7700, transparent: true, opacity: 0.7 });

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const cupGeom = new THREE.CylinderGeometry(0.2, 0.1, 0.18, 8);
      const cup = new THREE.Mesh(cupGeom, brassMat);
      cup.position.set(Math.cos(angle) * 1.0, 0.15, Math.sin(angle) * 1.0);
      group.add(cup);

      const fGroup = new THREE.Group();
      fGroup.position.set(Math.cos(angle) * 1.0, 0.35, Math.sin(angle) * 1.0);

      const fInner = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.35, 6), flameMat);
      fInner.position.y = 0.17;
      fGroup.add(fInner);

      const fOuter = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.45, 6), outerFlameMat);
      fOuter.position.y = 0.22;
      fGroup.add(fOuter);

      group.add(fGroup);
    }

    const centerLight = new THREE.PointLight(0xffa500, 3.0, 16);
    centerLight.position.set(0, 0.8, 0);
    group.add(centerLight);

    group.position.set(-6, 0.1, -2);
    group.scale.set(0.9, 0.9, 0.9);

    this.scene.add(group);
    this.aartiThali = group;
  }

  // Mithai Platter with Clickable Interactive Sweets
  setupMithaiThali() {
    const group = new THREE.Group();
    const silverMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeee,
      metalness: 0.9,
      roughness: 0.2
    });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.2, 0.08, 16), silverMat);
    group.add(plate);

    // Kaju Katli (Silver diamond shapes)
    const kajuMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 });
    for (let i = 0; i < 4; i++) {
      const kaju = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.08, 0.3), kajuMat);
      kaju.rotation.y = (i * Math.PI) / 4;
      kaju.position.set(Math.cos(i) * 0.5, 0.08, Math.sin(i) * 0.5);
      kaju.userData = { isSweet: true, name: "Kaju Katli (Cashew Fudge Diamond)" };
      group.add(kaju);
      this.sweetMeshes.push(kaju);
    }

    // Motichoor Laddoos (Golden saffron spheres)
    const laddooMat = new THREE.MeshStandardMaterial({ color: 0xff8800, roughness: 0.8 });
    for (let j = 0; j < 5; j++) {
      const laddoo = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), laddooMat);
      laddoo.position.set(Math.cos(j * 1.3) * 0.65, 0.16, Math.sin(j * 1.3) * 0.65);
      laddoo.userData = { isSweet: true, name: "Motichoor Laddoo (Sacred Saffron Sweet)" };
      group.add(laddoo);
      this.sweetMeshes.push(laddoo);
    }

    group.position.set(6, 0.08, -2);
    this.scene.add(group);
  }

  // ==========================================================================
  // AYODHYA VOLUMETRIC LASER SHOW BEAMS
  // ==========================================================================
  setupLaserBeams() {
    const laserColors = [0x00ffcc, 0xff0077, 0xffd700, 0x00ff88, 0xbf5af2, 0xff9900];
    const beamGeom = new THREE.CylinderGeometry(0.08, 0.3, 100, 8);
    beamGeom.translate(0, 50, 0);

    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: laserColors[i],
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending
      });
      const beam = new THREE.Mesh(beamGeom, mat);
      const angle = (i / 6) * Math.PI * 2;
      beam.position.set(Math.cos(angle) * 12, 0, -4 + Math.sin(angle) * 8);
      this.laserGroup.add(beam);
      this.laserBeams.push({ mesh: beam, baseAngle: angle, speed: 1.5 + i * 0.3 });
    }

    this.scene.add(this.laserGroup);
  }

  triggerLaserShow(duration = 7000) {
    this.isLaserActive = true;
    this.laserBeams.forEach(b => {
      b.mesh.material.opacity = 0.75;
    });

    setTimeout(() => {
      this.laserBeams.forEach(b => {
        b.mesh.material.opacity = 0;
      });
      this.isLaserActive = false;
    }, duration);
  }

  performMahaAarti() {
    if (this.isAartiActive) return;
    this.isAartiActive = true;
    this.aartiTime = 0;

    audio.playRealAarti();

    setTimeout(() => {
      this.isAartiActive = false;
      this.aartiThali.position.set(-6, 0.1, -2);
      this.aartiThali.rotation.set(0, 0, 0);
    }, 8000);
  }

  generateRangoliTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const cx = 512;
    const cy = 512;

    ctx.clearRect(0, 0, 1024, 1024);

    const rings = [
      { r: 470, color: '#ffd700', width: 10 },
      { r: 430, color: '#e63946', width: 16 },
      { r: 380, color: '#fb8500', width: 20 },
      { r: 310, color: '#00e676', width: 14 },
      { r: 240, color: '#00d4ff', width: 12 },
      { r: 150, color: '#ffb703', width: 24 },
      { r: 70,  color: '#e63946', width: 14 }
    ];

    rings.forEach(ring => {
      ctx.beginPath();
      ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
      ctx.strokeStyle = ring.color;
      ctx.lineWidth = ring.width;
      ctx.stroke();
    });

    const numPetals = 16;
    for (let i = 0; i < numPetals; i++) {
      const angle = (i / numPetals) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(80, 260, 0, 420);
      ctx.quadraticCurveTo(-80, 260, 0, 0);
      ctx.fillStyle = i % 2 === 0 ? 'rgba(230, 57, 70, 0.85)' : 'rgba(251, 133, 0, 0.85)';
      ctx.fill();
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.restore();
    }

    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      ctx.beginPath();
      ctx.arc(0, 180, 20, 0, Math.PI * 2);
      ctx.fillStyle = '#ffd700';
      ctx.fill();

      ctx.restore();
    }

    return canvas;
  }

  update(delta) {
    if (this.waterMesh) {
      this.waterClock += delta * 1.2;
      this.waterMesh.position.y = -2.4 + Math.sin(this.waterClock) * 0.04;
      this.waterMesh.rotation.z = Math.sin(this.waterClock * 0.4) * 0.004;
    }

    if (this.starPoints) {
      this.starPoints.rotation.y += 0.00015;
    }

    if (this.isAartiActive && this.aartiThali) {
      this.aartiTime += delta * 1.6;
      const radius = 2.8;
      const x = Math.cos(this.aartiTime) * radius;
      const z = -4 + Math.sin(this.aartiTime) * radius;
      const y = 2.0 + Math.sin(this.aartiTime * 2) * 0.35;

      this.aartiThali.position.set(x, y, z);
      this.aartiThali.rotation.z = Math.sin(this.aartiTime) * 0.2;
      this.aartiThali.rotation.y += delta * 2;
    }

    // Laser Show Beam Sweeps
    if (this.isLaserActive) {
      const time = Date.now() * 0.002;
      this.laserBeams.forEach(b => {
        b.mesh.rotation.z = Math.sin(time * b.speed) * 0.45;
        b.mesh.rotation.x = Math.cos(time * b.speed * 0.8) * 0.35;
      });
    }
  }

  setupBlenderModel() {
    this.blenderGroup = new THREE.Group();
    this.blenderGroup.position.set(0, 0.05, 0);
    this.scene.add(this.blenderGroup);

    const loader = new GLTFLoader();
    loader.load(
      '/models/diwali_scene.glb',
      (gltf) => {
        const model = gltf.scene;
        model.scale.set(1.4, 1.4, 1.4);
        model.position.set(0, 0.08, 0);

        // Enhance materials for WebGL vibrancy
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.roughness = Math.max(0.2, child.material.roughness || 0.3);
            }
          }
        });

        this.blenderGroup.add(model);
        console.log('✨ Authentic Blender 3D Diwali Model loaded into WebGL scene successfully!');
      },
      undefined,
      (err) => {
        console.warn('Blender 3D model load deferred:', err);
      }
    );
  }

  toggleBlenderModel() {
    this.isBlenderModelVisible = !this.isBlenderModelVisible;
    this.blenderGroup.visible = this.isBlenderModelVisible;
    return this.isBlenderModelVisible;
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
