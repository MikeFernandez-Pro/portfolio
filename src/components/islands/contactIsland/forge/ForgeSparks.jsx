import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import forgeSparksVertexShader from '#shaders/forgeSparks/vertex.glsl';
import forgeSparksFragmentShader from '#shaders/forgeSparks/fragment.glsl';

const COUNT = 100;

const positions = new Float32Array(COUNT * 3);
const sizes = new Float32Array(COUNT);
const angles = new Float32Array(COUNT);
const speed = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  const i3 = i * 3;

  positions[i3] = 0;
  positions[i3 + 1] = 0;
  positions[i3 + 2] = 0;

  sizes[i] = Math.random();
  angles[i] = Math.random() * Math.PI * 2;
  speed[i] = Math.random() * 0.5 + 0.5;
}

const ForgeSparks = props => {
  const { forgeSparksRef } = props;

  const { width, height, pixelRatio } = useThree(state => ({
    width: state.size.width,
    height: state.size.height,
    pixelRatio: state.viewport.dpr,
  }));

  const forgeSparksMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uSize: { value: 0.06 },
          uResolution: {
            value: new THREE.Vector2(width * pixelRatio, height * pixelRatio),
          },
          uProgress: { value: 0 },
        },
        vertexShader: forgeSparksVertexShader,
        fragmentShader: forgeSparksFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame(() => {
    forgeSparksMaterial.uniforms.uResolution.value.set(
      width * pixelRatio,
      height * pixelRatio
    );
  });

  return (
    <points
      ref={forgeSparksRef}
      position={[-9.93, -1.11, 9.16]}
      material={forgeSparksMaterial}
    >
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={COUNT}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aAngle"
          count={COUNT}
          array={angles}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aSpeed"
          count={COUNT}
          array={speed}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  );
};

export { ForgeSparks };
