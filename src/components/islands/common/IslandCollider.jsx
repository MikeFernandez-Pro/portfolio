import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';

import islandColliderModel from '#assets/models/islandColliders/island-colliders.glb?url';

// The walkable world: one static trimesh the character capsule collides with,
// baked to world space with the transform the collider mesh used to carry
const IslandCollider = () => {
  const { nodes } = useGLTF(islandColliderModel);

  useEffect(() => {
    const bvh = buildWorldSpaceBvh(nodes.Collider.geometry, {
      position: [-1.35, 2.3, -15],
      scale: 0.45,
    });
    const handle = physicsWorld.addSolid(bvh);
    return () => handle.remove();
  }, [nodes]);

  return null;
};

useGLTF.preload(islandColliderModel);

export { IslandCollider };
