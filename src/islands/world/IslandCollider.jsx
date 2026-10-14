import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';

import { buildWorldSpaceBvh } from '#physics/buildBvh.js';
import { physicsWorld } from '#physics/world.js';
import { ISLAND_COLLIDER_TRANSFORM } from '#islands/islandSpace.js';

import islandColliderModel from '#assets/models/islandColliders/island-colliders.glb?url';

// The walkable world: one static trimesh the character capsule collides with,
// baked to world space
const IslandCollider = () => {
  const { nodes } = useGLTF(islandColliderModel);

  useEffect(() => {
    const bvh = buildWorldSpaceBvh(
      nodes.Collider.geometry,
      ISLAND_COLLIDER_TRANSFORM
    );
    const handle = physicsWorld.addSolid(bvh);
    return () => handle.remove();
  }, [nodes]);

  return null;
};

useGLTF.preload(islandColliderModel);

export { IslandCollider };
