import * as THREE from 'three/webgpu';
import {
  abs,
  attribute,
  float,
  fract,
  min,
  mix,
  positionGeometry,
  select,
  sin,
  smoothstep,
  time,
  uv,
  vec3,
} from 'three/tsl';

// Streak timing scale (times the speed control) and how far past the ribbon
// ends the streak center travels, in ribbon lengths (times lengthMultiplier)
const TIME_MULTIPLIER = 0.04;
const STREAK_RANGE = 4;
// Streak half-width along the ribbon: its smoothstep reaches 0 at this
// distance (times lengthMultiplier) from the center
const STREAK_HALF_WIDTH = 0.4;

/**
 * The wind-line ribbons' material (WindLines.jsx; React-free so
 * scripts/check-wgsl.mjs can build it). `uniforms`: uSpeed,
 * uLengthMultiplier, uAlphaMultiplier, uColor. Reads the per-instance
 * aInstanceOffset / aInstanceTimeOffset attributes.
 */
export const createWindLinesMaterial = uniforms => {
  // Unlit glow: lights off
  const windMaterial = new THREE.MeshBasicNodeMaterial({
    lights: false,
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true,
    side: THREE.DoubleSide,
  });

  const instanceOffset = attribute('aInstanceOffset', 'vec3');
  const instanceTimeOffset = attribute('aInstanceTimeOffset', 'float');
  const timeMultiplier = uniforms.uSpeed.mul(TIME_MULTIPLIER);

  // A soft streak sliding along the ribbon (its center travels from
  // STREAK_RANGE lengths before the start to as far past the end)
  const t = fract(time.add(instanceTimeOffset).mul(timeMultiplier));
  const range = uniforms.uLengthMultiplier.mul(STREAK_RANGE);
  const center = mix(float(0.5).sub(range), float(0.5).add(range), t);

  // Offset the (pre-rotated) ribbon, then two sine wobbles (the mesh has no
  // transform: local space is world space)
  const placed = positionGeometry.add(instanceOffset);
  const localTime = time.add(instanceTimeOffset).mul(timeMultiplier);
  const y = placed.y.add(sin(uv().x.mul(10).add(localTime)).mul(0.1));
  const z = placed.z.add(sin(placed.x.add(localTime.mul(2))).mul(0.2));
  // The streak is off the ribbon ~90% of the time: collapse the whole ribbon
  // to a point then, so its fully transparent triangles aren't rasterized
  const streakOnRibbon = abs(center.sub(0.5)).lessThan(
    float(STREAK_HALF_WIDTH).div(uniforms.uLengthMultiplier).add(0.5)
  );
  windMaterial.positionNode = select(
    streakOnRibbon,
    vec3(placed.x, y, z),
    vec3(0)
  );

  const d = abs(uv().x.sub(center)).mul(uniforms.uLengthMultiplier);
  const streak = float(1).sub(smoothstep(0.1, STREAK_HALF_WIDTH, d));
  const edge = min(uv().x, uv().x.oneMinus());
  const edgeFade = smoothstep(0, 0.1, edge);

  windMaterial.colorNode = uniforms.uColor;
  windMaterial.opacityNode = streak
    .mul(edgeFade)
    .mul(uniforms.uAlphaMultiplier);

  return windMaterial;
};
