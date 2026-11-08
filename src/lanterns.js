import * as THREE from 'three';

// ==========================================================================
// 3D SKY WISH LANTERNS (KANDILS / FLOATING LANTERNS)
// ==========================================================================

export class LanternManager {
  constructor(scene) {
    this.scene = scene;
    this.lanterns = [];
    this.lanternMeshesForRaycast = [];

    // Shared Materials
    this.paperMaterial = new THREE.MeshStandardMaterial({
      color: 0xff8c00,
      emissive: 0xff5500,
      emissiveIntensity: 0.8,
      roughness: 0.4,
      transparent: true,
      opacity: 0.92
    });

    this.rimMaterial = new THREE.MeshBasicMaterial({ color: 0x331100 });

    this.setupPreseededLanterns();
  }

  createLanternMesh(wishText, author) {
    const group = new THREE.Group();

    // 1. Lantern Cylindrical Paper Body
    const bodyGeom = new THREE.CylinderGeometry(0.85, 0.7, 2.2, 12, 1, true);
    const body = new THREE.Mesh(bodyGeom, this.paperMaterial.clone());
    body.castShadow = false;
    group.add(body);

    // 2. Top & Bottom Bamboo Rims
    const topRimGeom = new THREE.TorusGeometry(0.86, 0.05, 8, 16);
    topRimGeom.rotateX(Math.PI / 2);
    const topRim = new THREE.Mesh(topRimGeom, this.rimMaterial);
    topRim.position.y = 1.1;
    group.add(topRim);

    const botRimGeom = new THREE.TorusGeometry(0.71, 0.05, 8, 16);
    botRimGeom.rotateX(Math.PI / 2);
    const botRim = new THREE.Mesh(botRimGeom, this.rimMaterial);
    botRim.position.y = -1.1;
    group.add(botRim);

    // 3. Inner Glowing Flame Light
    const lanternLight = new THREE.PointLight(0xffaa22, 1.6, 18);
    lanternLight.position.set(0, -0.6, 0);
    group.add(lanternLight);

    // 4. Little Candle at Bottom
    const candleGeom = new THREE.SphereGeometry(0.18, 8, 8);
    const candleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const candle = new THREE.Mesh(candleGeom, candleMat);
    candle.position.set(0, -0.6, 0);
    group.add(candle);

    // Meta & Physics
    group.userData = {
      isLantern: true,
      wish: wishText || "May light triumph over darkness and bring immense joy!",
      author: author || "Auspicious Devotee",
      ascentSpeed: 1.2 + Math.random() * 0.8,
      wobbleSpeed: 1.5 + Math.random() * 1.5,
      wobbleOffset: Math.random() * 10,
      windDrift: new THREE.Vector3((Math.random() - 0.5) * 0.35, 0, (Math.random() - 0.5) * 0.35)
    };

    // Collect meshes for raycasting
    group.traverse(child => {
      if (child.isMesh) {
        child.userData.lanternParent = group;
        this.lanternMeshesForRaycast.push(child);
      }
    });

    return group;
  }

  // Release a new wish lantern
  releaseLantern(wishText, author, startPos) {
    const lantern = this.createLanternMesh(wishText, author);

    const x = startPos ? startPos.x : (Math.random() - 0.5) * 16;
    const z = startPos ? startPos.z : (Math.random() - 0.5) * 16;
    const y = startPos ? startPos.y : 1.5;

    lantern.position.set(x, y, z);
    this.scene.add(lantern);
    this.lanterns.push(lantern);

    return lantern;
  }

  setupPreseededLanterns() {
    const preseeds = [
      {
        wish: "Wishing peace, golden health, and happiness to all families celebrating Diwali worldwide! 🪔",
        author: "Ayodhya Heritage Trust",
        pos: [-12, 15, -18]
      },
      {
        wish: "May Goddess Lakshmi bring boundless success, wisdom, and laughter into your home!",
        author: "Festival of Lights Society",
        pos: [14, 25, -24]
      },
      {
        wish: "Subho Deepaboli! May all dreams shine as bright as a thousand celestial diyas! ✨",
        author: "Devotee of Light",
        pos: [-5, 38, -32]
      },
      {
        wish: "Love, light, kindness, and eternal prosperity to every soul on Earth! 🕊️",
        author: "Universal Harmony",
        pos: [22, 45, -15]
      }
    ];

    preseeds.forEach(p => {
      const l = this.createLanternMesh(p.wish, p.author);
      l.position.set(p.pos[0], p.pos[1], p.pos[2]);
      this.scene.add(l);
      this.lanterns.push(l);
    });
  }

  update(delta, time) {
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const lantern = this.lanterns[i];
      const data = lantern.userData;

      // Ascend slowly upwards
      lantern.position.y += data.ascentSpeed * delta;
      lantern.position.x += data.windDrift.x * delta;
      lantern.position.z += data.windDrift.z * delta;

      // Gentle rocking wobble
      const wobble = Math.sin(time * data.wobbleSpeed + data.wobbleOffset) * 0.05;
      lantern.rotation.z = wobble;
      lantern.rotation.x = Math.cos(time * data.wobbleSpeed * 0.8 + data.wobbleOffset) * 0.04;

      // If lantern ascends above 160 units, recycle gently to sky horizon
      if (lantern.position.y > 160) {
        lantern.position.y = 12;
        lantern.position.x = (Math.random() - 0.5) * 40;
        lantern.position.z = -20 - Math.random() * 30;
      }
    }
  }
}

