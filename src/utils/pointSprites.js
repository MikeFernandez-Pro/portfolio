import * as THREE from 'three/webgpu';
import { instancedBufferAttribute, length, max, uv, vec2 } from 'three/tsl';

// WebGPU draws THREE.Points as 1px points (no gl_PointSize). Sized particles
// are an instanced THREE.Sprite with a PointsNodeMaterial instead: one quad
// per particle, `sizeNode` in pixels like gl_PointSize. With
// sizeAttenuation, three scales it by (canvas height / 2) / -viewZ, so a GLSL
// `gl_PointSize = k * uResolution.y / -viewZ` becomes `sizeNode = 2 * k`.

/** gl_PointCoord of the sprite quad: origin top-left, y down. */
const pointCoord = /*@__PURE__*/ vec2(uv().x, uv().y.oneMinus());

/** Soft glow around the particle center (firefly falloff): 0 at the rim. */
const pointGlow = () =>
  max(length(pointCoord.sub(0.5)), 0.001)
    .reciprocal()
    .mul(0.05)
    .sub(0.1)
    .clamp(0, 1);

/**
 * Per-particle attribute node (one value per instance), readable in both
 * shader stages.
 */
const particleAttribute = (array, itemSize) =>
  instancedBufferAttribute(new THREE.InstancedBufferAttribute(array, itemSize));

/**
 * Instanced sprite drawing `count` particles with `material` (a
 * PointsNodeMaterial whose positionNode reads a particle attribute). Never
 * frustum culled: the sprite's own origin says nothing about where its
 * particles are.
 */
const createParticleSprite = (material, count) => {
  const sprite = new THREE.Sprite(material);
  sprite.count = count;
  sprite.frustumCulled = false;
  return sprite;
};

/**
 * Additive, depth-write-free PointsNodeMaterial for glowing particles.
 * transparent puts them in the transparent render list - required for a
 * sprite's renderOrder to place them after smoke columns (opaque objects
 * draw before all transparent ones, whatever their renderOrder), so the
 * glow reads through the smoke instead of being painted over by it.
 */
const createGlowPointsMaterial = () =>
  new THREE.PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

/**
 * Spreads `count` particles over `anchorCount` anchors (torches, lanterns)
 * in contiguous runs: returns `i => anchor index`, to call with increasing
 * i. The boundary test is `>`, so the first anchor gets one particle more
 * and the last one fewer than an even split — kept as tuned.
 */
const anchorSpread = (count, anchorCount) => {
  let slot = 1;
  return i => {
    if (i > (count / anchorCount) * slot) slot++;
    return slot - 1;
  };
};

/**
 * Debug entry for how many of a sprite's particles are drawn (its buffers
 * are allocated for `max`).
 */
const spriteCountControl = (sprite, value, max) => ({
  value,
  min: 0,
  max,
  step: 1,
  onChange: v => {
    sprite.count = v;
  },
});

export {
  pointCoord,
  pointGlow,
  particleAttribute,
  createParticleSprite,
  createGlowPointsMaterial,
  anchorSpread,
  spriteCountControl,
};
