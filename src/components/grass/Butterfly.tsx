import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import type * as THREE from "three";

import butterflyModel from "/models/butterfly.glb?url";

type Model = {
  nodes: {
    Butterfly: {
      geometry: THREE.BufferGeometry;
      skeleton: THREE.Skeleton;
    };
    rightWing: THREE.Mesh;
    leftWing: THREE.Mesh;
  };
  animations: THREE.AnimationClip[];
};

type Props = {
  position: [number, number, number];
  scale: number;
  color: string;
};

const Butterfly = (props: Props) => {
  const { position, scale, color } = props;
  const group = useRef<THREE.Group>(null);
  const { nodes, animations } = useGLTF(butterflyModel) as unknown as Model;
  const { actions } = useAnimations(animations, group);

  useEffect(() => {
    actions.Fly?.play();
  }, [actions.Fly]);

  useFrame(({ clock }) => {
    if (group.current) {
      group.current.position.x = Math.sin(clock.getElapsedTime()) + position[0];
      group.current.position.z = Math.cos(clock.getElapsedTime()) + position[2];
      group.current.position.y =
        Math.sin(clock.getElapsedTime()) * 0.5 + position[1];
      group.current.rotation.y = clock.getElapsedTime() + Math.PI / 2;
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
