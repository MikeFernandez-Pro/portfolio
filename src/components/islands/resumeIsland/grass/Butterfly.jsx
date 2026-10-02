import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import butterflyModel from '#assets/models/island/butterfly.glb?url';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

const Butterfly = props => {
  const { position, scale, color } = props;
  const group = useRef < THREE.Group > null;
  const { nodes, animations } = useGLTF(butterflyModel);
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    actions.Fly?.play();
  }, [actions.Fly]);

  useFrame(({ clock }) => {
    if (group.current) {
      // Reduced motion: hold the t=0 pose - it hovers (wings still flap)
      // instead of circling the island
      const t = REDUCED_MOTION_AT_LOAD ? 0 : clock.getElapsedTime();
      group.current.position.x = Math.sin(t) + position[0];
      group.current.position.z = Math.cos(t) + position[2];
      group.current.position.y = Math.sin(t) * 0.5 + position[1];
      group.current.rotation.y = t + Math.PI / 2;
    }
  });

  return (
    <group ref={group} scale={scale}>
      <skinnedMesh
        name="Butterfly"
        geometry={nodes.Butterfly.geometry}
        skeleton={nodes.Butterfly.skeleton}
      >
        <meshStandardMaterial color={color} />
      </skinnedMesh>
      <primitive object={nodes.rightWing} />
      <primitive object={nodes.leftWing} />
    </group>
  );
};

export { Butterfly };

useGLTF.preload(butterflyModel);
