import * as THREE from 'three/webgpu';
import { instancedBufferAttribute, uv, vec2 } from 'three/tsl';

// WebGPU draws THREE.Points as 1px points (no gl_PointSize). Sized particles
// are an instanced THREE.Sprite with a PointsNodeMaterial instead: one quad
// per particle, `sizeNode` in pixels like gl_PointSize. With
// sizeAttenuation, three scales it by (canvas height / 2) / -viewZ, so a GLSL
// `gl_PointSize = k * uResolution.y / -viewZ` becomes `sizeNode = 2 * k`.

/** gl_PointCoord of the sprite quad: origin top-left, y down. */
const pointCoord = /*@__PURE__*/ vec2(uv().x, uv().y.oneMinus());

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

export { pointCoord, particleAttribute, createParticleSprite };
