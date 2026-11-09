import * as THREE from 'three';
import { createLanternPaper, createGlowTexture } from './textures.js';

// ==========================================================================
// SKY WISH LANTERNS
// Rice-paper lanterns lit from within. They glow through the paper (brighter
// near the flame), sway in the breeze and drift away. No per-lantern point
// lights: those used to pile up and stall the renderer.
// ==========================================================================

const MAX_LANTERNS = 28;

export class LanternManager {
  constructor(scene) {
    this.scene = scene;
    this.lanterns = [];
    this.lanternMeshesForRaycast = [];
    this.motion = 1;

    const profile = [
      [0.0, 1.32], [0.5, 1.28], [0.78, 1.12], [0.86, 0.85], [0.84, 0.2], [0.74, -0.55], [0.62, -1.0]
    ].map(([x, y]) => new THREE.Vector2(x, y));
    this.bodyGeom = new THREE.LatheGeometry(profile, 24);
    this.bodyGeom.computeVertexNormals();
    this.ringGeom = new THREE.TorusGeometry(0.62, 0.03, 6, 24).rotateX(Math.PI / 2);
    this.wireGeom = new THREE.BoxGeometry(1.24, 0.015, 0.015);

    this.papers = [createLanternPaper('amber', 5), createLanternPaper('rose', 6)].map((tex) =>
      new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: 0xffffff,
        emissiveIntensity: 1.25,
        roughness: 0.85,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.96
      })
    );
    this.bambooMat = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.8 });
    this.glowMat = new THREE.SpriteMaterial({
      map: createGlowTexture(128, [
        [0, 'rgba(255,230,170,1)'],
        [0.25, 'rgba(255,170,70,0.5)'],
        [1, 'rgba(255,120,40,0)']
      ]),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.85
    });
    this.hitGeom = new THREE.SphereGeometry(1.6, 8, 6);
    this.hitMat = new THREE.MeshBasicMaterial({ visible: false });

    this.setupPreseededLanterns();
  }

  createLanternMesh(wishText, author) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(this.bodyGeom, this.papers[Math.random() < 0.7 ? 0 : 1]);
    group.add(body);

    const ring = new THREE.Mesh(this.ringGeom, this.bambooMat);
    ring.position.y = -1.0;
    group.add(ring);
    const w1 = new THREE.Mesh(this.wireGeom, this.bambooMat);
    w1.position.y = -1.0;
    const w2 = w1.clone();
    w2.rotation.y = Math.PI / 2;
    group.add(w1, w2);

    const glow = new THREE.Sprite(this.glowMat);
    glow.scale.setScalar(2.6);
    glow.position.y = -0.7;
    group.add(glow);

    const inner = new THREE.Sprite(this.glowMat);
    inner.scale.setScalar(0.6);
    inner.position.y = -0.95;
    group.add(inner);

    const hit = new THREE.Mesh(this.hitGeom, this.hitMat);
    group.add(hit);

    group.userData = {
      wish: wishText || 'May light triumph over darkness and bring immense joy!',
      author: author || 'A fellow celebrant',
      ascent: 1.1 + Math.random() * 0.7,
      wobbleSpeed: 1.2 + Math.random() * 1.2,
      wobbleOffset: Math.random() * 10,
      drift: new THREE.Vector3((Math.random() - 0.5) * 0.5, 0, -0.2 - Math.random() * 0.4),
      age: 0,
      fade: 1,
      preseed: false,
      hit
    };
    hit.userData.lanternParent = group;
    this.lanternMeshesForRaycast.push(hit);
    return group;
  }

  releaseLantern(wishText, author, startPos) {
    const lantern = this.createLanternMesh(wishText, author);
    const x = startPos ? startPos.x : (Math.random() - 0.5) * 14;
    const z = startPos ? startPos.z : -2 + (Math.random() - 0.5) * 10;
    lantern.position.set(x, startPos ? startPos.y : 1.2, z);
    lantern.scale.setScalar(0.01);
    this.scene.add(lantern);
    this.lanterns.push(lantern);

    // retire the oldest non-preseeded lantern if the sky is crowded
    if (this.lanterns.length > MAX_LANTERNS) {
      const idx = this.lanterns.findIndex((l) => !l.userData.preseed);
      if (idx >= 0) this.removeLantern(idx);
    }
    return lantern;
  }

  removeLantern(i) {
    const l = this.lanterns[i];
    this.scene.remove(l);
    const h = this.lanternMeshesForRaycast.indexOf(l.userData.hit);
    if (h >= 0) this.lanternMeshesForRaycast.splice(h, 1);
    this.lanterns.splice(i, 1);
  }

  setupPreseededLanterns() {
    const preseeds = [
      { wish: 'Wishing peace, good health and happiness to every family celebrating Diwali.', author: 'Your neighbours', pos: [-12, 15, -22] },
      { wish: 'May Goddess Lakshmi bring success, wisdom and laughter into your home.', author: 'Festival of Lights', pos: [14, 24, -26] },
      { wish: 'Subho Deepaboli! May your dreams shine as bright as a thousand diyas.', author: 'From Kolkata with love', pos: [-5, 34, -34] },
      { wish: 'Love, light and kindness to every soul on Earth.', author: 'Universal harmony', pos: [22, 42, -18] },
      { wish: 'Let every dark corner of the world find its own small lamp.', author: 'A grateful heart', pos: [6, 20, -40] }
    ];
    preseeds.forEach((p) => {
      const l = this.createLanternMesh(p.wish, p.author);
      l.position.set(p.pos[0], p.pos[1], p.pos[2]);
      l.userData.preseed = true;
      this.scene.add(l);
      this.lanterns.push(l);
    });
  }

  setMotion(m) {
    this.motion = m;
  }

  update(delta, time) {
    const m = this.motion;
    for (let i = this.lanterns.length - 1; i >= 0; i--) {
      const l = this.lanterns[i];
      const d = l.userData;
      d.age += delta;

      // inflate as the hot air fills it
      const s = Math.min(1, d.age * 1.6);
      l.scale.setScalar(s * s * (3 - 2 * s) * d.fade);

      l.position.y += d.ascent * delta;
      l.position.x += d.drift.x * delta;
      l.position.z += d.drift.z * delta;
      l.rotation.z = Math.sin(time * d.wobbleSpeed + d.wobbleOffset) * 0.06 * m;
      l.rotation.x = Math.cos(time * d.wobbleSpeed * 0.8 + d.wobbleOffset) * 0.05 * m;

      if (l.position.y > 120) {
        if (d.preseed) {
          l.position.set((Math.random() - 0.5) * 50, 10, -22 - Math.random() * 25);
        } else {
          d.fade = Math.max(0, d.fade - delta * 0.5);
          if (d.fade <= 0) this.removeLantern(i);
        }
      }
    }
  }
}
