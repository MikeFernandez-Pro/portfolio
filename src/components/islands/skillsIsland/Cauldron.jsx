import * as THREE from 'three';
import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const SPEED = 0.5;

const Cauldron = props => {
  const { island } = props;

  const spoonRef = useRef(null);

  useEffect(() => {
    const spoon = island.scene.getObjectByName('pot');
    spoonRef.current = spoon;

    const cauldron = island.scene.getObjectByName('island_8');
    cauldron.material?.dispose();
    cauldron.material = new THREE.MeshBasicMaterial({
      color: 'red',
    });
  }, [island]);

  useFrame((_state, delta) => {
    if (spoonRef.current) {
      spoonRef.current.rotation.y += delta * SPEED;
    }
  });

  return null;
};

export { Cauldron };
