import { useLayoutEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import liquidVertexShader from '#shaders/liquid/vertex.glsl';
import liquidFragmentShader from '#shaders/liquid/fragment.glsl';

const LiquidsShaders = ({ well, cauldron }) => {
  const wellShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorStart: { value: new THREE.Color('#3f8ac0') },
          uColorEnd: { value: new THREE.Color('#106fb3') },
        },
        transparent: true,
      }),
    []
  );

  const cauldronShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: liquidVertexShader,
        fragmentShader: liquidFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColorStart: { value: new THREE.Color('#89b359') },
          uColorEnd: { value: new THREE.Color('#4b6647') },
        },
        transparent: true,
      }),
    []
  );

  useLayoutEffect(() => {
    well.position.y += 0.1;
    well.material = wellShaderMaterial;
    cauldron.material = cauldronShaderMaterial;
  }, []);

  useFrame(({ elapsed }) => {
    well.material.uniforms.uTime.value = elapsed;
    cauldron.material.uniforms.uTime.value = elapsed;
  });
};

export default LiquidsShaders;
