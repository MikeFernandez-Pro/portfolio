import { useRef } from 'react';
import { extend, useFrame } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei/legacy';
import * as THREE from 'three';

import smokeVertexShader from '#shaders/smoke/vertex.glsl';
import smokeFragmentShader from '#shaders/smoke/fragment.glsl';

const Smoke = () => {
  const smokeRef = useRef();

  const SmokeShaderMaterial = shaderMaterial(
    {
      uTime: 0,
      uColor: new THREE.Color('#313131'),
      uOpacity: 0.5,
      uFadeHeight: 1,
      uBaseFade: 0,
      uTimeOffsetStrength: 1,
      uDisplacementUv: 2.8,
      uDisplacementUvY: 1.6,
      newPositionY: 1.69,
    },
    smokeVertexShader,
    smokeFragmentShader
  );

  extend({ SmokeShaderMaterial });

  useFrame(({ elapsed }) => {
    smokeRef.current.uniforms.uTime.value = elapsed;
  });

  return (
    <mesh position={[-1.55, 6.8, -55.89]} rotation={[0, 0, -0.3]}>
      <planeGeometry attach="geometry" args={[0.3, 10, 16, 128]} />
      <smokeShaderMaterial ref={smokeRef} transparent depthWrite={false} />
    </mesh>
  );
};

export default Smoke;
