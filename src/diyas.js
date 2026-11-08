import * as THREE from 'three';
import { audio } from './audio.js';

// ==========================================================================
// 3D DIYAS ENGINE: TRADITIONAL CLAY DIYAS & FLOATING LOTUS DIYAS
// ==========================================================================

export class DiyaManager {
  constructor(scene, particleEngine) {
    this.scene = scene;
    this.particleEngine = particleEngine;
    this.diyas = [];
    this.floatingDiyas = [];
    this.diyaMeshesForRaycast = [];

    // Shared Materials & Geometries
    this.clayMaterial = new THREE.MeshStandardMaterial({
      color: 0x9e3c1b, // Terracotta Reddish-Clay
      roughness: 0.8,
      metalness: 0.1
    });

    this.brassMaterial = new THREE.MeshStandardMaterial({
      color: 0xd4af37, // Polished Sacred Brass
      roughness: 0.35,
      metalness: 0.8
    });

    this.wickMaterial = new THREE.MeshBasicMaterial({ color: 0x221105 });

    this.flameMaterial = new THREE.MeshBasicMaterial({
      color: 0xffe600,
      transparent: true,
      opacity: 0.95
    });

    this.outerFlameMaterial = new THREE.MeshBasicMaterial({
      color: 0xff5500,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });

    this.lotusMaterial = new THREE.MeshStandardMaterial({
      color: 0xff66cc, // Pink Lotus
      roughness: 0.5,
      side: THREE.DoubleSide
    });

    this.setupCourtyardDiyas();
    this.setupInitialFloatingDiyas();
  }

  // Helper to create a single 3D Diya Group
  createDiyaModel(isBrass = false) {
    const group = new THREE.Group();

    // 1. Terracotta / Brass Bowl Base
    // Pinched traditional teardrop diya profile
    const bowlGeom = new THREE.CylinderGeometry(0.55, 0.25, 0.35, 16);
    const bowl = new THREE.Mesh(bowlGeom, isBrass ? this.brassMaterial : this.clayMaterial);
    bowl.position.y = 0.17;
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Diya beak/lip
    const beakGeom = new THREE.ConeGeometry(0.2, 0.45, 8);
    const beak = new THREE.Mesh(beakGeom, isBrass ? this.brassMaterial : this.clayMaterial);
    beak.rotation.z = Math.PI / 3;
    beak.position.set(0.45, 0.25, 0);
    group.add(beak);

    // 2. Cotton Wick
    const wickGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.22, 6);
    const wick = new THREE.Mesh(wickGeom, this.wickMaterial);
    wick.position.set(0.2, 0.35, 0);
    wick.rotation.z = Math.PI / 6;
    group.add(wick);

    // 3. Flame Group (Inner + Outer Teardrop Shell)
    const flameGroup = new THREE.Group();
    flameGroup.position.set(0.25, 0.52, 0);

    const innerFlameGeom = new THREE.ConeGeometry(0.12, 0.45, 12);
    innerFlameGeom.translate(0, 0.22, 0);
    const innerFlame = new THREE.Mesh(innerFlameGeom, this.flameMaterial);
    flameGroup.add(innerFlame);

    const outerFlameGeom = new THREE.ConeGeometry(0.22, 0.6, 12);
    outerFlameGeom.translate(0, 0.3, 0);
    const outerFlame = new THREE.Mesh(outerFlameGeom, this.outerFlameMaterial);
    flameGroup.add(outerFlame);

    flameGroup.scale.set(0.001, 0.001, 0.001); // start hidden/unlit
    group.add(flameGroup);

    // 4. Dynamic Point Light (only for main brass / primary diyas to prevent GPU light limit lag)
    let diyaLight = null;
    if (isBrass) {
      diyaLight = new THREE.PointLight(0xffa500, 0, 15);
      diyaLight.position.set(0.25, 0.65, 0);
      group.add(diyaLight);
    }

    // Store references
    group.userData = {
      isDiya: true,
      isLit: false,
      flameGroup: flameGroup,
      light: diyaLight,
      flickerOffset: Math.random() * 100,
      baseY: 0
    };

    return group;
  }

  // Place diyas in auspicious positions
  setupCourtyardDiyas() {
    const diyaConfigs = [
      // Concentric on Rangoli
      { x: 0, z: -4, brass: true, lit: true }, // Central Grand Brass Aarti Diya (already lit as eternal jyoti)
      { x: 2.2, z: -4, brass: false, lit: false },
      { x: -2.2, z: -4, brass: false, lit: false },
      { x: 0, z: -1.8, brass: false, lit: false },
      { x: 0, z: -6.2, brass: false, lit: false },

      // Courtyard Corners & Perimeter
      { x: -8, z: 2, brass: false, lit: false },
      { x: 8, z: 2, brass: false, lit: false },
      { x: -12, z: -4, brass: false, lit: false },
      { x: 12, z: -4, brass: false, lit: false },
      { x: -8, z: -10, brass: false, lit: false },
      { x: 8, z: -10, brass: false, lit: false },

      // Ghat Steps (descending towards water)
      { x: -5, z: 9.2, y: 0.02, brass: false, lit: false },
      { x: 0, z: 9.2, y: 0.02, brass: false, lit: false },
      { x: 5, z: 9.2, y: 0.02, brass: false, lit: false },
    ];

    diyaConfigs.forEach((cfg, idx) => {
      const diya = this.createDiyaModel(cfg.brass);
      const y = cfg.y !== undefined ? cfg.y : 0;
      diya.position.set(cfg.x, y, cfg.z);
      diya.userData.baseY = y;
      diya.userData.id = idx;

      this.scene.add(diya);
      this.diyas.push(diya);

      // Collect meshes for raycasting
      diya.traverse(child => {
        if (child.isMesh) {
          child.userData.diyaParent = diya;
          this.diyaMeshesForRaycast.push(child);
        }
      });

      if (cfg.lit) {
        this.igniteDiya(diya, false);
      }
    });
  }

  // Floating Lotus Diya on Water
  createFloatingLotusDiya(x, z) {
    const group = new THREE.Group();

    // Lotus Petals Base
    const petalCount = 8;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i / petalCount) * Math.PI * 2;
      const petalGeom = new THREE.ConeGeometry(0.35, 1.1, 4);
      petalGeom.rotateX(Math.PI / 2.3);
      const petal = new THREE.Mesh(petalGeom, this.lotusMaterial);
      petal.rotation.y = angle;
      petal.position.set(Math.cos(angle) * 0.25, 0.05, Math.sin(angle) * 0.25);
      group.add(petal);
    }

    // Center Golden Diya
    const diyaModel = this.createDiyaModel(true);
    diyaModel.scale.set(0.7, 0.7, 0.7);
    diyaModel.position.set(0, 0.08, 0);
    group.add(diyaModel);

    // Floating Properties
    group.position.set(x, -2.35, z);
    group.userData = {
      isFloating: true,
      driftSpeed: 0.25 + Math.random() * 0.35,
      bobOffset: Math.random() * 20,
      diya: diyaModel
    };

    // Lit by default
    this.igniteDiya(diyaModel, false);

    this.scene.add(group);
    this.floatingDiyas.push(group);

    return group;
  }

  setupInitialFloatingDiyas() {
    const initialCoords = [
      [-15, 25],
      [-5, 32],
      [8, 28],
      [18, 35],
      [-22, 38],
      [3, 42]
    ];

    initialCoords.forEach(c => {
      this.createFloatingLotusDiya(c[0], c[1]);
    });
  }

  // Ignite Diya with Animation & Sound
  igniteDiya(diya, playSound = true) {
    if (!diya || diya.userData.isLit) return;

    diya.userData.isLit = true;

    // Scale up flame
    const flame = diya.userData.flameGroup;
    flame.scale.set(1, 1, 1);

    // Turn on PointLight if present
    const light = diya.userData.light;
    if (light) light.intensity = 1.8;

    if (playSound) {
      audio.playDiyaChime();
      const worldPos = new THREE.Vector3();
      diya.getWorldPosition(worldPos);
      worldPos.y += 0.5;
      this.particleEngine.createIgnitionSpark(worldPos);
    }
  }

  // Extinguish Diya
  extinguishDiya(diya) {
    if (!diya || !diya.userData.isLit) return;
    diya.userData.isLit = false;
    diya.userData.flameGroup.scale.set(0.001, 0.001, 0.001);
    if (diya.userData.light) diya.userData.light.intensity = 0;
  }

  // Light All Courtyard Diyas
  lightAll() {
    audio.playDiyaChime();
    this.diyas.forEach((diya, i) => {
      setTimeout(() => {
        this.igniteDiya(diya, true);
      }, i * 90);
    });
  }

  // Reset/Extinguish Courtyard Diyas (leave central jyoti)
  resetAll() {
    this.diyas.forEach((diya, i) => {
      if (i !== 0) { // Keep central eternal diya
        this.extinguishDiya(diya);
      }
    });
  }

  getLitCount() {
    return this.diyas.filter(d => d.userData.isLit).length;
  }

  getTotalCount() {
    return this.diyas.length;
  }

  // Frame Update Loop (Flame flicker & water drifting)
  update(delta, time) {
    // 1. Courtyard Diyas flame flicker
    for (let diya of this.diyas) {
      if (diya.userData.isLit) {
        const offset = diya.userData.flickerOffset;
        const noise = Math.sin(time * 18 + offset) * 0.15 + Math.cos(time * 30 + offset) * 0.1;
        
        // Scale flame subtly
        diya.userData.flameGroup.scale.y = 1.0 + noise * 0.6;
        diya.userData.flameGroup.rotation.z = noise * 0.3;

        // Modulate point light intensity if present
        if (diya.userData.light) diya.userData.light.intensity = 1.8 + noise * 0.7;
      }
    }

    // 2. Floating Lotus Diyas drift and bob
    for (let fDiya of this.floatingDiyas) {
      // Drift gently along X axis (river flow)
      fDiya.position.x += fDiya.userData.driftSpeed * delta;
      if (fDiya.position.x > 50) {
        fDiya.position.x = -50; // loop back
      }

      // Bobbing on water
      const bob = Math.sin(time * 2 + fDiya.userData.bobOffset) * 0.08;
      fDiya.position.y = -2.35 + bob;
      fDiya.rotation.z = Math.sin(time * 1.5 + fDiya.userData.bobOffset) * 0.04;

      // Flame flicker on floating diya
      const childDiya = fDiya.userData.diya;
      if (childDiya && childDiya.userData.isLit) {
        const noise = Math.sin(time * 20 + fDiya.userData.bobOffset) * 0.2;
        childDiya.userData.flameGroup.scale.y = 1.0 + noise * 0.5;
        childDiya.userData.light.intensity = 1.5 + noise * 0.6;
      }
    }
  }
}

