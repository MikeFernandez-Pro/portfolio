import * as THREE from 'three/webgpu';
import {
  cos,
  float,
  fract,
  max,
  mix,
  PI2,
  sin,
  smoothstep,
  time,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import { uniformControls } from '#debug/uniformControls.js';
import {
  createGlowPointsMaterial,
  createParticleSprite,
  particleAttribute,
  pointGlow,
  spriteCountControl,
} from '#utils/pointSprites.js';

// Sparks spiralling into the open portal, as if it were sucking in reality
const SPARKS_DEFAULTS = {
  count: 80,
  color: '#00a3ff',
  intensity: 20,
  size: 0.043,
  speed: 0.12,
  spawnRadius: 1.3,
  swirlTurns: 0.35,
  frontOffset: 0.9,
};

// Buffers are allocated at the max once; the live count control only
// changes how many sprite instances are drawn
const SPARKS_COUNT = 200;
const sparksSizes = new Float32Array(SPARKS_COUNT);
const sparksAngles = new Float32Array(SPARKS_COUNT);
const sparksSpeeds = new Float32Array(SPARKS_COUNT);
const sparksPhases = new Float32Array(SPARKS_COUNT);

for (let i = 0; i < SPARKS_COUNT; i++) {
  sparksSizes[i] = Math.random() * 0.6 + 0.4;
  sparksAngles[i] = Math.random() * Math.PI * 2;
  sparksSpeeds[i] = Math.random() * 0.8 + 0.6;
  sparksPhases[i] = Math.random();
}

// Sparks spiralling into the open portal: each loops on its own phase,
// spawning on a wide ring in front of the portal and diving into the disc
const createPortalSparksMaterial = u => {
  const material = createGlowPointsMaterial();

  const aSize = particleAttribute(sparksSizes, 1);
  const aAngle = particleAttribute(sparksAngles, 1);
  const aSpeed = particleAttribute(sparksSpeeds, 1);
  const aPhase = particleAttribute(sparksPhases, 1);

  const t = fract(time.mul(u.uSpeed).mul(aSpeed).add(aPhase));
  const ease = t.mul(t).mul(float(3).sub(t.mul(2)));

  const radius = mix(u.uSpawnRadius, 0.06, ease).mul(u.uOpenFactor);
  const angle = aAngle.add(t.mul(u.uSwirlTurns).mul(PI2));
  material.positionNode = vec3(
    cos(angle).mul(radius),
    sin(angle).mul(radius),
    u.uFrontOffset.mul(ease.oneMinus())
  );

  // Sparks shrink as they get sucked in
  material.sizeNode = u.uSize
    .mul(aSize)
    .mul(mix(1, 0.4, ease))
    .mul(2);

  // Fade in on spawn, vanish right before reaching the disc; hidden
  // entirely while the portal is closed. Firefly-style glow falloff (alpha 0
  // outside it)
  const life = smoothstep(0, 0.2, t)
    .mul(smoothstep(0.75, 1, t).oneMinus())
    .mul(u.uOpenFactor);
  const glow = pointGlow();
  material.colorNode = vec4(u.uColor.mul(u.uIntensity), glow.mul(max(life, 0)));

  return material;
};

/**
 * The sparks sprite at `position` (hidden by the caller until the portal
 * opens) and its uniforms. `uOpenFactor` (0-1) grows them in with the
 * portal opening.
 */
export const createPortalSparks = position => {
  const uniforms = {
    uOpenFactor: uniform(0),
    uSize: uniform(SPARKS_DEFAULTS.size),
    uColor: uniform(new THREE.Color(SPARKS_DEFAULTS.color)),
    uIntensity: uniform(SPARKS_DEFAULTS.intensity),
    uSpawnRadius: uniform(SPARKS_DEFAULTS.spawnRadius),
    uSwirlTurns: uniform(SPARKS_DEFAULTS.swirlTurns),
    uFrontOffset: uniform(SPARKS_DEFAULTS.frontOffset),
    uSpeed: uniform(SPARKS_DEFAULTS.speed),
  };
  const sparks = createParticleSprite(
    createPortalSparksMaterial(uniforms),
    SPARKS_DEFAULTS.count
  );
  sparks.position.copy(position);
  return { sparks, uniforms };
};

// Debug entries for the sparks
export const portalSparksControls = (sparks, uniforms) => {
  const control = uniformControls(uniforms);
  const d = SPARKS_DEFAULTS;
  return {
    count: spriteCountControl(sparks, d.count, SPARKS_COUNT),
    color: control('uColor', d.color),
    intensity: control('uIntensity', d.intensity, 0, 20, 0.1),
    size: control('uSize', d.size, 0, 0.3, 0.001),
    speed: control('uSpeed', d.speed, 0, 1, 0.005),
    spawnRadius: control('uSpawnRadius', d.spawnRadius, 0, 3, 0.01),
    swirlTurns: control('uSwirlTurns', d.swirlTurns, -2, 2, 0.01),
    frontOffset: control('uFrontOffset', d.frontOffset, 0, 3, 0.01),
  };
};
