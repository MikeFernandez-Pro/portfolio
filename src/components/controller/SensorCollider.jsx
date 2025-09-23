import { useMemo } from 'react';
import { RigidBody } from '@react-three/rapier';
import { useGLTF } from '@react-three/drei';

import IslandSensorsModel from '#assets/models/islandSensors/islandSensors.glb';

export default function SensorCollider({ onEnter, onExit }) {
  const { nodes } = useMemo(() => useGLTF(IslandSensorsModel), []);
  nodes.Sensor.material.visible = false;

  return (
    <RigidBody
      type={'fixed'}
      colliders={'trimesh'}
      sensor
      onIntersectionEnter={onEnter}
      onIntersectionExit={onExit}
    >
      <mesh
        scale={0.45}
        position={[-1.35, 2.4, -15]}
        geometry={nodes.Sensor.geometry}
        material={nodes.Sensor.material}
      />
    </RigidBody>
  );
}

useGLTF.preload(IslandSensorsModel);
