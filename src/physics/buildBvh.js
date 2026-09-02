import * as THREE from 'three';
import { MeshBVH } from 'three-mesh-bvh';

const matrix = new THREE.Matrix4();
const translation = new THREE.Vector3();
const quaternion = new THREE.Quaternion();
const euler = new THREE.Euler();
const scaleVector = new THREE.Vector3();

/**
 * Builds a BVH over a copy of `geometry` baked into world space (position /
 * rotation / scale of what used to be the collider mesh transform). All
 * colliders and sensors here are static, so baking once makes the per-frame
 * capsule tests matrix-free. Only the position attribute and index are
 * copied — the BVH needs nothing else.
 */
export function buildWorldSpaceBvh(
  geometry,
  { position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 } = {}
) {
  const [sx, sy, sz] = typeof scale === 'number' ? [scale, scale, scale] : scale;
  matrix.compose(
    translation.set(...position),
    quaternion.setFromEuler(euler.set(...rotation)),
    scaleVector.set(sx, sy, sz)
  );

  const baked = new THREE.BufferGeometry();
  baked.setAttribute('position', geometry.getAttribute('position').clone());
  if (geometry.index) baked.setIndex(geometry.index.clone());
  baked.applyMatrix4(matrix);

  // verbose defaults to true in three-mesh-bvh and would log on every bake
  // (island collider, falling/death zones, 9 interactive boxes)
  return new MeshBVH(baked, { verbose: false });
}
