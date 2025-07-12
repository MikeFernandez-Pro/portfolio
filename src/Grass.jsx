import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

import grassVertexShader from "./shaders/newGrass/vertex.glsl";
import grassFragmentShader from "./shaders/newGrass/fragment.glsl";

const NUM_GRASS = 4;
const GRASS_SEGMENTS = 6;
const GRASS_VERTICES = (GRASS_SEGMENTS + 1) * 2;
const GRASS_PATCH_SIZE = 10;
const GRASS_WIDTH = 0.25;
const GRASS_HEIGHT = 2;

// Grass geometry
const VERTICES = (GRASS_SEGMENTS + 1) * 2;
const indices = [];

for (let i = 0; i < GRASS_SEGMENTS; i++) {
  const vi = i * 2;
  indices[i * 12 + 0] = vi + 0;
  indices[i * 12 + 1] = vi + 1;
  indices[i * 12 + 2] = vi + 2;

  indices[i * 12 + 3] = vi + 2;
  indices[i * 12 + 4] = vi + 1;
  indices[i * 12 + 5] = vi + 3;

  const fvi = VERTICES + vi;
  indices[i * 12 + 6] = fvi + 2;
  indices[i * 12 + 7] = fvi + 1;
  indices[i * 12 + 8] = fvi + 0;

  indices[i * 12 + 9] = fvi + 3;
  indices[i * 12 + 10] = fvi + 1;
  indices[i * 12 + 11] = fvi + 2;
}

const grassGeometry = new THREE.InstancedBufferGeometry();
grassGeometry.instanceCount = NUM_GRASS;
grassGeometry.setIndex(indices);
grassGeometry.boundingSphere = new THREE.Sphere(
  new THREE.Vector3(0, 0, 0),
  1 + GRASS_PATCH_SIZE * 2
);

// Grass material
const uniforms = {
  uGrassParams: {
    value: new THREE.Vector4(
      GRASS_SEGMENTS,
      GRASS_VERTICES,
      GRASS_WIDTH,
      GRASS_HEIGHT
    ),
  },
  uTime: { value: 0 },
  uResolution: { value: new THREE.Vector2(1, 1) },
};

const grassMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: grassVertexShader,
  fragmentShader: grassFragmentShader,
});

const Grass = () => {
  return (
    <mesh
      position={[1, 1, -10]}
      geometry={grassGeometry}
      material={grassMaterial}
    />
  );
};

export { Grass };
