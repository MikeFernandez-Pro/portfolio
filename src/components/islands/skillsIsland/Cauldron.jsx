import { useFrame } from '@react-three/fiber';

const SPEED = 0.5;

const Cauldron = props => {
  const { island } = props;

  useFrame((_state, delta) => {
    island.nodes.pot.rotation.y += delta * SPEED;
  });

  return (
    <skinnedMesh
      name="island_8"
      geometry={island.nodes.island_8.geometry}
      skeleton={island.nodes.island_8.skeleton}
      morphTargetDictionary={island.nodes.island_8.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_8.morphTargetInfluences}
    >
      <meshBasicMaterial color="red" />
    </skinnedMesh>
  );
};

export { Cauldron };
