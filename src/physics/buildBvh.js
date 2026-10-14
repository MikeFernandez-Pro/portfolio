import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const matrix = new THREE.Matrix4();
const translation = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scaleVector = new THREE.Vector3();

/**
 * Copy of `geometry` baked into world space (position / rotation / scale).
 * Only the position attribute and index are copied — collision needs
 * nothing else.
 */
export function bakeToWorldSpace(
  geometry,
  { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = {}
) {
  const [sx, sy, sz] =
    typeof scale === 'number' ? [scale, scale, scale] : scale;
  matrix.compose(
    translation.set(...position),
    quaternion.setFromEuler(euler.set(...rotation)),
    scaleVector.set(sx, sy, sz)
  );

  const baked = new THREE.BufferGeometry();
  baked.setAttribute('position', geometry.getAttribute('position').clone());
  if (geometry.index) baked.setIndex(geometry.index.clone());
  baked.applyMatrix4(matrix);
  return baked;
}

/**
 * BVH over `geometry` baked into world space (see bakeToWorldSpace). All
 * colliders and sensors here are static, so baking once makes the per-frame
 * capsule tests matrix-free.
 */
export function buildWorldSpaceBvh(geometry, transform) {
  // verbose defaults to true in three-mesh-bvh and would log on every bake
  // (island collider, falling/death zones, 9 interactive boxes)
  return new MeshBVH(bakeToWorldSpace(geometry, transform), {
    verbose: false,
  });
}
