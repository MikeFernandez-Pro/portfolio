import { useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';

import islandColliderModel from '/models/islandColliders/islandColliders.glb?url';

const IslandCollider = () => {
  const { nodes } = useGLTF(islandColliderModel);

  useEffect(() => {
    nodes.Collider.material.visible = false;
  }, []);

  return (
    <RigidBody type={'fixed'} colliders={'trimesh'}>
      <mesh
        scale={0.45}
        position={[-1.35, 2.3, -15]}
        geometry={nodes.Collider.geometry}
        material={nodes.Collider.material}
      />
    </RigidBody>
  );
};

useGLTF.preload(islandColliderModel);

export { IslandCollider };
