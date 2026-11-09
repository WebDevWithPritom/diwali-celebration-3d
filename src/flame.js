import * as THREE from 'three';
import { createGlowTexture } from './textures.js';

// ==========================================================================
// REALISTIC OIL-LAMP FLAME
// A camera-facing teardrop drawn in a shader: blue at the wick, a white-hot
// core, a soft orange envelope and an organic, noise-driven flicker. It is
// rendered in HDR so the bloom pass gives it a natural halo.
// ==========================================================================

// Shared by every flame so one update per frame animates all of them
export const flameUniforms = {
  uTime: { value: 0 },
  uMotion: { value: 1 } // 0..1, lowered for prefers-reduced-motion
};

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uMotion;
  varying vec2 vUv;
  varying float vFlick;

  void main() {
    vUv = uv;
    vec3 center = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    // cylindrical billboard: always face the camera but stay upright
    vec3 camRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 right = normalize(vec3(camRight.x, 0.0, camRight.z) + 1e-5);
    float sx = length(modelMatrix[0].xyz);
    float sy = length(modelMatrix[1].xyz);

    float t = uTime + uSeed * 17.0;
    float flick = 1.0 + uMotion * (0.07 * sin(t * 9.1) + 0.05 * sin(t * 15.7 + 1.3) + 0.04 * sin(t * 23.3));
    vFlick = flick;

    vec3 world = center + right * position.x * sx + vec3(0.0, 1.0, 0.0) * position.y * sy * flick;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uSeed;
  uniform float uIntensity;
  uniform float uMotion;
  varying vec2 vUv;
  varying float vFlick;

  void main() {
    float y = vUv.y;
    float x = (vUv.x - 0.5) * 2.0;
    float t = uTime + uSeed * 17.0;

    // the tip sways more than the base, like a real flame in moving air
    float sway = uMotion * (sin(t * 3.3 + y * 3.0) * 0.10 + sin(t * 7.9 + y * 8.0) * 0.05) * y * y;
    x -= sway;

    // teardrop width profile
    float w = 1.45 * pow(max(y, 0.0), 0.55) * pow(max(1.0 - y, 0.0), 0.9);
    float d = abs(x) / max(w, 0.001);

    float body = smoothstep(1.0, 0.45, d) * smoothstep(0.0, 0.05, y);
    float core = smoothstep(0.8, 0.0, d) * smoothstep(0.62, 0.12, y) * smoothstep(0.02, 0.14, y);
    float blue = smoothstep(0.24, 0.02, y) * smoothstep(1.05, 0.35, d);

    vec3 envelope = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.62, 0.18), smoothstep(0.0, 0.7, y));
    envelope = mix(envelope, vec3(0.9, 0.2, 0.04), smoothstep(0.6, 1.0, y)); // reddish tip
    vec3 col = envelope * body;
    col = mix(col, vec3(1.0, 0.93, 0.74) * 1.6, core);
    col += vec3(0.18, 0.32, 1.0) * blue * 0.7;

    float a = clamp(max(body, blue * 0.6), 0.0, 1.0);
    gl_FragColor = vec4(col * uIntensity * 1.8 * vFlick, a);
  }
`;

const planeGeom = new THREE.PlaneGeometry(1, 1);
planeGeom.translate(0, 0.5, 0);

let glowTex = null;
function getGlowTexture() {
  if (!glowTex) {
    glowTex = createGlowTexture(128, [
      [0, 'rgba(255,214,140,1)'],
      [0.18, 'rgba(255,170,70,0.55)'],
      [0.45, 'rgba(255,120,30,0.14)'],
      [1, 'rgba(255,90,20,0)']
    ]);
  }
  return glowTex;
}

let poolTex = null;
function getPoolTexture() {
  if (!poolTex) {
    poolTex = createGlowTexture(128, [
      [0, 'rgba(255,190,110,0.9)'],
      [0.35, 'rgba(255,140,50,0.35)'],
      [1, 'rgba(255,110,30,0)']
    ]);
  }
  return poolTex;
}

/**
 * Builds a flame with halo and an optional pool of light on the floor.
 * Returns a Group with userData.setIntensity(v) and userData.tick(time).
 */
export function createFlame({ width = 0.16, height = 0.42, halo = 1.1, pool = 0, poolOffset = 0, seed = Math.random() * 100 } = {}) {
  const group = new THREE.Group();

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: flameUniforms.uTime,
      uMotion: flameUniforms.uMotion,
      uSeed: { value: seed },
      uIntensity: { value: 1 }
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const flame = new THREE.Mesh(planeGeom, mat);
  flame.scale.set(width, height, 1);
  flame.renderOrder = 10;
  flame.frustumCulled = false;
  group.add(flame);

  const haloMat = new THREE.SpriteMaterial({
    map: getGlowTexture(),
    color: 0xffffff,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    opacity: 0.55
  });
  const haloSprite = new THREE.Sprite(haloMat);
  haloSprite.scale.setScalar(halo);
  haloSprite.position.y = height * 0.4;
  haloSprite.renderOrder = 9;
  group.add(haloSprite);

  let poolMesh = null;
  if (pool > 0) {
    const poolMat = new THREE.MeshBasicMaterial({
      map: getPoolTexture(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -2
    });
    poolMesh = new THREE.Mesh(new THREE.PlaneGeometry(pool, pool), poolMat);
    poolMesh.rotation.x = -Math.PI / 2;
    poolMesh.position.y = poolOffset;
    poolMesh.renderOrder = 2;
    group.add(poolMesh);
  }

  let intensity = 1;
  group.userData = {
    flameMesh: flame,
    halo: haloSprite,
    pool: poolMesh,
    setIntensity(v) {
      intensity = v;
      mat.uniforms.uIntensity.value = v;
      group.visible = v > 0.001;
    },
    tick(time) {
      // halo and floor pool breathe with the flame
      const t = time + seed * 17.0;
      const m = flameUniforms.uMotion.value;
      const f = 1 + m * (0.08 * Math.sin(t * 9.1) + 0.05 * Math.sin(t * 15.7 + 1.3));
      haloMat.opacity = 0.4 * intensity * f;
      if (poolMesh) poolMesh.material.opacity = 0.28 * intensity * f;
    }
  };
  return group;
}
