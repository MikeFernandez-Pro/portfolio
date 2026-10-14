import * as THREE from 'three/webgpu';
import {
  cos,
  float,
  floor,
  fract,
  length,
  mix,
  PI2,
  pow,
  sin,
  smoothstep,
  sqrt,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { hash12 } from '#shaders/includes/hash.js';
import { uniformControls } from '#debug/uniformControls.js';
import {
  createGlowPointsMaterial,
  createParticleSprite,
  particleAttribute,
  pointCoord,
  pointDisc,
  spriteCountControl,
} from '#utils/pointSprites.js';

// Boiling bubbles popping on the potion surface
const BUBBLES_DEFAULTS = {
  count: 5,
  color: '#35d567',
  intensity: 1,
  opacity: 1,
  coreOpacity: 0.51,
  rimThickness: 0.14,
  size: 0.171,
  speed: 0.465,
  growPower: 0.7,
  pop: 0.855,
  spread: 0.75,
};

// Buffers are allocated at the max once; the count control only changes
// how many sprite instances are drawn. Spawn spots are hashed per cycle in
// the shader, so only per-bubble timing/size randomness lives here.
const BUBBLES_COUNT = 80;
const bubblesPhases = new Float32Array(BUBBLES_COUNT);
const bubblesSpeeds = new Float32Array(BUBBLES_COUNT);
const bubblesSizes = new Float32Array(BUBBLES_COUNT);

for (let i = 0; i < BUBBLES_COUNT; i++) {
  bubblesPhases[i] = Math.random();
  bubblesSpeeds[i] = Math.random() * 0.8 + 0.6;
  bubblesSizes[i] = Math.random() * 0.6 + 0.4;
}

// Boiling bubbles: each loops on its own phase and respawns at a new random
// spot of the surface every cycle, like water at a rolling boil: it stays in
// place, swells, then bursts
const createBubblesMaterial = u => {
  const material = createGlowPointsMaterial();

  const aPhase = particleAttribute(bubblesPhases, 1);
  const aSpeed = particleAttribute(bubblesSpeeds, 1);
  const aSize = particleAttribute(bubblesSizes, 1);

  const progress = time.mul(u.uSpeed).mul(aSpeed).add(aPhase);
  const t = fract(progress);
  const cycle = floor(progress);

  const seed = vec2(aPhase.mul(137.13), aSpeed.mul(91.7)).add(cycle);
  const angle = hash12(seed).mul(PI2);
  const radius = sqrt(hash12(seed.add(17.31))).mul(u.uSpread);
  material.positionNode = vec3(
    cos(angle).mul(radius).mul(u.uHalfSize.x),
    0,
    sin(angle).mul(radius).mul(u.uHalfSize.y)
  );

  // The size swells over the whole life (uGrowPower shapes the curve),
  // while the alpha pops sharply at the end instead of shrinking
  const swell = pow(t, u.uGrowPower);
  const life = smoothstep(0, 0.08, t).mul(
    smoothstep(u.uPopStart, 1, t).oneMinus()
  );
  material.sizeNode = u.uSize.mul(aSize).mul(swell).mul(2);

  // Bright rim around a tunable fill (0 = hollow ring, 1 = full disc),
  // alpha 0 outside the disc
  const distanceToCenter = length(pointCoord.sub(0.5));
  const rim = smoothstep(
    float(0.48).sub(u.uRimThickness),
    0.48,
    distanceToCenter
  );
  const alpha = mix(u.uCoreOpacity, 1, rim)
    .mul(life)
    .mul(u.uOpacity)
    .mul(pointDisc());
  material.colorNode = vec4(u.uColor.mul(u.uIntensity), alpha);

  return material;
};

/**
 * The bubbles sprite and its uniforms, spread over the potion disc
 * (`halfSize`: its XZ half extent). The caller positions it.
 */
export const createCauldronBubbles = halfSize => {
  const uniforms = {
    uHalfSize: uniform(halfSize),
    uColor: uniform(new THREE.Color(BUBBLES_DEFAULTS.color)),
    uIntensity: uniform(BUBBLES_DEFAULTS.intensity),
    uOpacity: uniform(BUBBLES_DEFAULTS.opacity),
    uCoreOpacity: uniform(BUBBLES_DEFAULTS.coreOpacity),
    uRimThickness: uniform(BUBBLES_DEFAULTS.rimThickness),
    uSize: uniform(BUBBLES_DEFAULTS.size),
    uSpeed: uniform(BUBBLES_DEFAULTS.speed),
    uGrowPower: uniform(BUBBLES_DEFAULTS.growPower),
    uPopStart: uniform(BUBBLES_DEFAULTS.pop),
    uSpread: uniform(BUBBLES_DEFAULTS.spread),
  };
  const bubbles = createParticleSprite(
    createBubblesMaterial(uniforms),
    BUBBLES_DEFAULTS.count
  );
  return { bubbles, uniforms };
};

// Debug entries for the bubbles
export const cauldronBubblesControls = (bubbles, uniforms) => {
  const d = BUBBLES_DEFAULTS;
  const control = uniformControls(uniforms);
  return {
    count: spriteCountControl(bubbles, d.count, BUBBLES_COUNT),
    color: control('uColor', d.color),
    intensity: control('uIntensity', d.intensity, 0, 20, 0.1),
    opacity: control('uOpacity', d.opacity, 0, 1, 0.01),
    // Inside fill of the bubble (0 = hollow ring, 1 = full disc)
    coreOpacity: control('uCoreOpacity', d.coreOpacity, 0, 1, 0.01),
    rimThickness: control('uRimThickness', d.rimThickness, 0.01, 0.48, 0.005),
    size: control('uSize', d.size, 0, 0.3, 0.001),
    speed: control('uSpeed', d.speed, 0, 2, 0.005),
    // Shape of the swelling over a bubble's life (< 1 grows fast then
    // slows down, > 1 the opposite)
    growPower: control('uGrowPower', d.growPower, 0.2, 3, 0.01),
    // Life fraction where the burst begins (closer to 1 = more sudden)
    pop: control('uPopStart', d.pop, 0.5, 0.99, 0.005),
    spread: control('uSpread', d.spread, 0, 1, 0.01),
  };
};
