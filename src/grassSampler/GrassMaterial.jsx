import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import grass_vs from './shader/vertex.glsl';
import grass_fs from './shader/fragment.glsl';

const createGrassMaterial = () => {

  const grassMaterial = shaderMaterial(
    {
      uTime: 0,
      uMouse: new THREE.Vector3(0, 0, 0),
      side: THREE.DoubleSide,
    },
    grass_vs,
    grass_fs,
  );

  return new grassMaterial();
};

export default createGrassMaterial;
