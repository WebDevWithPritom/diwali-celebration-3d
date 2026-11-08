import * as THREE from 'three';
import { audio } from './audio.js';

// ==========================================================================
// HIGH PERFORMANCE 60 FPS 3D PARTICLES ENGINE (ZERO LAG & LIGHT POOLING)
// ==========================================================================

export class ParticleEngine {
  constructor(scene) {
    this.scene = scene;
    this.activeFireworks = [];
    this.activeFountains = [];
    this.activeSpinners = [];
    this.sparkBursts = [];

    // Shared particle texture
    this.particleTexture = this.createSparkTexture();

    // 1. LIGHT POOL: Fixed 6 lights added ONCE at startup to PREVENT shader recompilation lag!
    this.lightPool = [];
    this.initLightPool();

    // 2. Handheld Sparkler (Phuljhadi) state
    this.sparklerActive = false;
    this.sparklerTipPos = new THREE.Vector3(0, 5, 10);
    this.sparklerSystem = null;
    this.sparklerLight = null;
    this.sparklerParticles = [];
    this.lightTrailPoints = [];
    this.lightTrailLine = null;

    this.initHandheldSparkler();
  }

  // Pre-allocate fixed lights so scene.add() is NEVER called dynamically during clicks
  initLightPool() {
    for (let i = 0; i < 6; i++) {
      const light = new THREE.PointLight(0xffd700, 0, 45);
      light.position.set(0, -100, 0);
      this.scene.add(light);
      this.lightPool.push({
        light: light,
        inUse: false,
        timer: 0
      });
    }
  }

  getAvailableLight() {
    for (let item of this.lightPool) {
      if (!item.inUse) {
        item.inUse = true;
        return item;
      }
    }
    return null;
  }

  releaseLight(item) {
    if (item) {
      item.light.intensity = 0;
      item.light.position.set(0, -100, 0);
      item.inUse = false;
    }
  }

  createSparkTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.35, 'rgba(255, 220, 100, 0.9)');
    grad.addColorStop(0.7, 'rgba(255, 120, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);

    return new THREE.CanvasTexture(canvas);
  }

  // ==========================================================================
  // HANDHELD SPARKLER (PHULJHADI)
  // ==========================================================================
  initHandheldSparkler() {
    const count = 90; // optimized count
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.85;
      colors[i * 3 + 2] = 0.4;

      this.sparklerParticles.push({
        active: false,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.sparklerSystem = new THREE.Points(geometry, material);
    this.scene.add(this.sparklerSystem);

    this.sparklerLight = new THREE.PointLight(0xffb703, 0, 14);
    this.scene.add(this.sparklerLight);

    const maxTrail = 40;
    const lineGeom = new THREE.BufferGeometry();
    const linePos = new Float32Array(maxTrail * 3);
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3));

    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffd700,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      linewidth: 2
    });

    this.lightTrailLine = new THREE.Line(lineGeom, lineMat);
    this.scene.add(this.lightTrailLine);
  }

  setSparklerActive(active) {
    this.sparklerActive = active;
    if (active) {
      audio.startSparklerSound();
      this.sparklerLight.intensity = 2.4;
    } else {
      audio.stopSparklerSound();
      this.sparklerLight.intensity = 0;
      this.lightTrailPoints = [];
    }
  }

  updateSparklerTip(pos3D) {
    if (!this.sparklerActive || !pos3D) return;
    this.sparklerTipPos.copy(pos3D);
    this.sparklerLight.position.copy(pos3D);

    this.lightTrailPoints.unshift(pos3D.clone());
    if (this.lightTrailPoints.length > 35) {
      this.lightTrailPoints.pop();
    }
  }

  // ==========================================================================
  // 1. SKY ROCKETS (ZERO LAG)
  // ==========================================================================
  launchRocket(targetPos) {
    audio.playRocketLaunch();

    const startX = targetPos ? targetPos.x : (Math.random() - 0.5) * 20;
    const startZ = targetPos ? targetPos.z : (Math.random() - 0.5) * 20;
    const targetY = 32 + Math.random() * 22;

    const rocket = {
      pos: new THREE.Vector3(startX, 0, startZ),
      vel: new THREE.Vector3(
        (Math.random() - 0.5) * 1.5,
        28 + Math.random() * 6,
        (Math.random() - 0.5) * 1.5
      ),
      targetY: targetY,
      color: this.getRandomFestiveColor()
    };

    const geom = new THREE.BufferGeometry();
    const posArr = new Float32Array([rocket.pos.x, rocket.pos.y, rocket.pos.z]);
    geom.setAttribute('position', new THREE.BufferAttribute(posArr, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffe066,
      size: 3.0,
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    rocket.mesh = new THREE.Points(geom, mat);
    this.scene.add(rocket.mesh);

    this.activeFireworks.push(rocket);
  }

  explodeRocket(rocket) {
    this.scene.remove(rocket.mesh);
    rocket.mesh.geometry.dispose();
    rocket.mesh.material.dispose();

    audio.playFireworkBurst();

    // Use pooled light (NO scene.add call!)
    const poolItem = this.getAvailableLight();
    if (poolItem) {
      poolItem.light.color.setHex(rocket.color);
      poolItem.light.position.copy(rocket.pos);
      poolItem.light.intensity = 3.5;
    }

    // Particle Burst using flat arrays (no vector object allocations!)
    const count = 180; // optimized count for silky 60 FPS
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const baseColor = new THREE.Color(rocket.color);
    const goldColor = new THREE.Color(0xffd700);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = rocket.pos.x;
      positions[idx + 1] = rocket.pos.y;
      positions[idx + 2] = rocket.pos.z;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const speed = 7 + Math.random() * 14;

      velocities[idx] = speed * Math.sin(phi) * Math.cos(theta);
      velocities[idx + 1] = speed * Math.sin(phi) * Math.sin(theta);
      velocities[idx + 2] = speed * Math.cos(phi);

      const c = Math.random() > 0.35 ? baseColor : goldColor;
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      map: this.particleTexture,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const particleSystem = new THREE.Points(geometry, material);
    this.scene.add(particleSystem);

    this.sparkBursts.push({
      particles: particleSystem,
      velocities: velocities,
      count: count,
      life: 1.0,
      decay: 0.016 + Math.random() * 0.006,
      poolItem: poolItem,
      gravity: -9.8
    });
  }

  // ==========================================================================
  // 2. 3D ANAR (FLOWERPOT FOUNTAIN)
  // ==========================================================================
  createAnarFountain(groundPos) {
    const x = groundPos ? groundPos.x : 0;
    const z = groundPos ? groundPos.z : 0;
    const y = groundPos ? groundPos.y : 0;

    audio.playAnarFountain();

    const coneGeom = new THREE.ConeGeometry(0.7, 1.4, 10);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x8b3a1a,
      roughness: 0.8
    });
    const cone = new THREE.Mesh(coneGeom, coneMat);
    cone.position.set(x, y + 0.7, z);
    this.scene.add(cone);

    const poolItem = this.getAvailableLight();
    if (poolItem) {
      poolItem.light.color.setHex(0xffaa22);
      poolItem.light.position.set(x, y + 2.5, z);
      poolItem.light.intensity = 2.8;
    }

    const count = 180;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const particleData = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + 1.4;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.9;
      colors[i * 3 + 2] = 0.4;

      particleData.push({
        active: false,
        pos: new THREE.Vector3(x, y + 1.4, z),
        vel: new THREE.Vector3(),
        life: 0
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const system = new THREE.Points(geometry, material);
    this.scene.add(system);

    this.activeFountains.push({
      cone: cone,
      system: system,
      poolItem: poolItem,
      particleData: particleData,
      origin: new THREE.Vector3(x, y + 1.4, z),
      duration: 3.8,
      age: 0
    });
  }

  // ==========================================================================
  // 3. 3D CHAKRI (GROUND SPINNER)
  // ==========================================================================
  createChakriSpinner(groundPos) {
    const x = groundPos ? groundPos.x : 4;
    const z = groundPos ? groundPos.z : 4;
    const y = groundPos ? groundPos.y : 0.05;

    audio.playChakriSpin();

    const discGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0x992211,
      roughness: 0.6
    });
    const disc = new THREE.Mesh(discGeom, discMat);
    disc.position.set(x, y, z);
    this.scene.add(disc);

    const poolItem = this.getAvailableLight();
    if (poolItem) {
      poolItem.light.color.setHex(0xff9900);
      poolItem.light.position.set(x, y + 0.3, z);
      poolItem.light.intensity = 2.2;
    }

    const count = 150;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const particleData = [];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = x;
      positions[i * 3 + 1] = y + 0.1;
      positions[i * 3 + 2] = z;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 0.1;

      particleData.push({
        active: false,
        pos: new THREE.Vector3(x, y + 0.1, z),
        vel: new THREE.Vector3(),
        life: 0
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const system = new THREE.Points(geometry, material);
    this.scene.add(system);

    this.activeSpinners.push({
      disc: disc,
      system: system,
      poolItem: poolItem,
      particleData: particleData,
      origin: new THREE.Vector3(x, y + 0.1, z),
      duration: 3.5,
      age: 0,
      angle: 0
    });
  }

  createIgnitionSpark(pos) {
    const count = 20;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      positions[idx] = pos.x;
      positions[idx + 1] = pos.y;
      positions[idx + 2] = pos.z;

      velocities[idx] = (Math.random() - 0.5) * 3;
      velocities[idx + 1] = 1.5 + Math.random() * 2.5;
      velocities[idx + 2] = (Math.random() - 0.5) * 3;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 1.2,
      map: this.particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const system = new THREE.Points(geometry, material);
    this.scene.add(system);

    this.sparkBursts.push({
      particles: system,
      velocities: velocities,
      count: count,
      life: 0.5,
      decay: 0.05,
      poolItem: null,
      gravity: -3
    });
  }

  // ==========================================================================
  // UPDATE LOOP (60 FPS OPTIMIZED)
  // ==========================================================================
  update(delta) {
    // 0. Update Sparkler
    if (this.sparklerActive) {
      const posAttr = this.sparklerSystem.geometry.attributes.position;
      let emitted = 0;
      for (let p of this.sparklerParticles) {
        if (!p.active && emitted < 5) {
          p.active = true;
          p.pos.copy(this.sparklerTipPos);
          const speed = 2.5 + Math.random() * 3;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.random() * Math.PI;
          p.vel.set(
            speed * Math.sin(phi) * Math.cos(theta),
            speed * Math.sin(phi) * Math.sin(theta),
            speed * Math.cos(phi)
          );
          p.life = 0.35 + Math.random() * 0.2;
          emitted++;
        }
      }

      for (let j = 0; j < this.sparklerParticles.length; j++) {
        const p = this.sparklerParticles[j];
        if (p.active) {
          p.life -= delta * 3.0;
          p.vel.y -= 4 * delta;
          p.pos.addScaledVector(p.vel, delta);
          posAttr.setXYZ(j, p.pos.x, p.pos.y, p.pos.z);
          if (p.life <= 0) {
            p.active = false;
            posAttr.setXYZ(j, 0, -100, 0);
          }
        }
      }
      posAttr.needsUpdate = true;

      if (this.lightTrailLine) {
        const linePos = this.lightTrailLine.geometry.attributes.position;
        for (let i = 0; i < 40; i++) {
          if (i < this.lightTrailPoints.length) {
            const pt = this.lightTrailPoints[i];
            linePos.setXYZ(i, pt.x, pt.y, pt.z);
          } else if (this.lightTrailPoints.length > 0) {
            const last = this.lightTrailPoints[this.lightTrailPoints.length - 1];
            linePos.setXYZ(i, last.x, last.y, last.z);
          } else {
            linePos.setXYZ(i, 0, -100, 0);
          }
        }
        linePos.needsUpdate = true;
      }
    }

    // 1. Update Rockets
    for (let i = this.activeFireworks.length - 1; i >= 0; i--) {
      const rocket = this.activeFireworks[i];
      rocket.pos.addScaledVector(rocket.vel, delta);
      rocket.mesh.geometry.attributes.position.setXYZ(0, rocket.pos.x, rocket.pos.y, rocket.pos.z);
      rocket.mesh.geometry.attributes.position.needsUpdate = true;

      if (rocket.pos.y >= rocket.targetY || rocket.vel.y <= 0) {
        this.explodeRocket(rocket);
        this.activeFireworks.splice(i, 1);
      }
    }

    // 2. Update Bursts using fast flat typed arrays
    for (let i = this.sparkBursts.length - 1; i >= 0; i--) {
      const burst = this.sparkBursts[i];
      burst.life -= burst.decay;

      const posAttr = burst.particles.geometry.attributes.position;
      const v = burst.velocities;
      const count = burst.count;

      for (let j = 0; j < count; j++) {
        const idx = j * 3;
        v[idx + 1] += burst.gravity * delta; // gravity
        v[idx] *= 0.98; // drag
        v[idx + 1] *= 0.98;
        v[idx + 2] *= 0.98;

        const x = posAttr.getX(j) + v[idx] * delta;
        const y = posAttr.getY(j) + v[idx + 1] * delta;
        const z = posAttr.getZ(j) + v[idx + 2] * delta;
        posAttr.setXYZ(j, x, y, z);
      }
      posAttr.needsUpdate = true;
      burst.particles.material.opacity = Math.max(0, burst.life);

      if (burst.poolItem) {
        burst.poolItem.light.intensity = burst.life * 3.5;
      }

      if (burst.life <= 0) {
        this.scene.remove(burst.particles);
        burst.particles.geometry.dispose();
        burst.particles.material.dispose();
        if (burst.poolItem) {
          this.releaseLight(burst.poolItem);
        }
        this.sparkBursts.splice(i, 1);
      }
    }

    // 3. Update Anar Fountains
    for (let i = this.activeFountains.length - 1; i >= 0; i--) {
      const fountain = this.activeFountains[i];
      fountain.age += delta;
      const progress = fountain.age / fountain.duration;

      const posAttr = fountain.system.geometry.attributes.position;
      if (progress < 1.0) {
        let emitted = 0;
        for (let p of fountain.particleData) {
          if (!p.active && emitted < 8) {
            p.active = true;
            p.pos.copy(fountain.origin);
            const spread = 0.35;
            const height = 9 + Math.random() * 8;
            p.vel.set(
              (Math.random() - 0.5) * spread * height,
              height,
              (Math.random() - 0.5) * spread * height
            );
            p.life = 1.0;
            emitted++;
          }
        }
        if (fountain.poolItem) fountain.poolItem.light.intensity = 2.5 + Math.random();
      }

      let anyActive = false;
      for (let j = 0; j < fountain.particleData.length; j++) {
        const p = fountain.particleData[j];
        if (p.active) {
          anyActive = true;
          p.life -= delta * 1.6;
          p.vel.y -= 18 * delta;
          p.pos.addScaledVector(p.vel, delta);
          posAttr.setXYZ(j, p.pos.x, p.pos.y, p.pos.z);
          if (p.life <= 0 || p.pos.y < fountain.origin.y - 0.5) {
            p.active = false;
            posAttr.setXYZ(j, fountain.origin.x, fountain.origin.y, fountain.origin.z);
          }
        }
      }
      posAttr.needsUpdate = true;

      if (progress >= 1.0 && !anyActive) {
        this.scene.remove(fountain.cone);
        this.scene.remove(fountain.system);
        fountain.cone.geometry.dispose();
        fountain.cone.material.dispose();
        fountain.system.geometry.dispose();
        fountain.system.material.dispose();
        if (fountain.poolItem) this.releaseLight(fountain.poolItem);
        this.activeFountains.splice(i, 1);
      }
    }

    // 4. Update Chakri Spinners
    for (let i = this.activeSpinners.length - 1; i >= 0; i--) {
      const spinner = this.activeSpinners[i];
      spinner.age += delta;
      const progress = spinner.age / spinner.duration;

      const spinSpeed = (1 - progress * 0.4) * 25;
      spinner.angle += spinSpeed * delta;
      spinner.disc.rotation.y = spinner.angle;

      const posAttr = spinner.system.geometry.attributes.position;
      if (progress < 1.0) {
        let emitted = 0;
        for (let p of spinner.particleData) {
          if (!p.active && emitted < 6) {
            p.active = true;
            p.pos.copy(spinner.origin);
            const speed = 7 + Math.random() * 5;
            p.vel.set(
              Math.cos(spinner.angle) * speed,
              0.2 + Math.random() * 0.6,
              Math.sin(spinner.angle) * speed
            );
            p.life = 0.5;
            emitted++;
          }
        }
      }

      let anyActive = false;
      for (let j = 0; j < spinner.particleData.length; j++) {
        const p = spinner.particleData[j];
        if (p.active) {
          anyActive = true;
          p.life -= delta * 1.8;
          p.pos.addScaledVector(p.vel, delta);
          posAttr.setXYZ(j, p.pos.x, p.pos.y, p.pos.z);
          if (p.life <= 0) {
            p.active = false;
            posAttr.setXYZ(j, spinner.origin.x, spinner.origin.y, spinner.origin.z);
          }
        }
      }
      posAttr.needsUpdate = true;

      if (progress >= 1.0 && !anyActive) {
        this.scene.remove(spinner.disc);
        this.scene.remove(spinner.system);
        spinner.disc.geometry.dispose();
        spinner.disc.material.dispose();
        spinner.system.geometry.dispose();
        spinner.system.material.dispose();
        if (spinner.poolItem) this.releaseLight(spinner.poolItem);
        this.activeSpinners.splice(i, 1);
      }
    }
  }

  getRandomFestiveColor() {
    const festiveColors = [
      0xff2a55, // Crimson
      0xff9900, // Marigold Gold
      0xffd700, // Sacred Yellow Gold
      0x00ff88, // Emerald Green
      0x00d4ff, // Peacock Cyan
      0xd946ef, // Lotus Magenta
      0xffffff  // Silver Starlight
    ];
    return festiveColors[Math.floor(Math.random() * festiveColors.length)];
  }
}
