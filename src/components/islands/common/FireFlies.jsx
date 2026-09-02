import { useEffect, useRef, useMemo } from 'react';
import { extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import firefliesVertexShader from '#shaders/fireflies/vertex.glsl';
import firefliesFragmentShader from '#shaders/fireflies/fragment.glsl';

const FIREFLIES_POSITIONS = [
  [-0.7, 2.3, -3.8],
  [0.7, 2.3, -3.8],
  [2.9, 2.3, -17.8],
  [4.2, 2.3, -17.6],
  [4, 4.3, -24.1],
  [5.25, 4.3, -23.9],
  [-0.25, 4.3, -29.15],
  [-0.1, 4.3, -30.5],
  [-6.6, 6.4, -29.9],
  [-6.4, 6.4, -31.2],
  [-9.2, 6.35, -35.6],
  [-10.5, 6.35, -35.6],
  [-10.5, 8.45, -41.9],
  [-9.15, 8.45, -41.9],
];

const FIREFLIES_PER_LAMP = 20;
const FIREFLIES_COLOR = '#d58e6b';
const FIREFLIES_INTENSITY = 8.34;
const FIREFLIES_SIZE = 0.03;
const TOTAL_FIREFLIES_COUNT = FIREFLIES_POSITIONS.length * FIREFLIES_PER_LAMP;

const POSITIONS_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT * 3);
const SCALES_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT);

let currrentLampCount = 1;
for (let i = 0; i < TOTAL_FIREFLIES_COUNT; i++) {
  if (
    i >
    (TOTAL_FIREFLIES_COUNT / FIREFLIES_POSITIONS.length) * currrentLampCount
  ) {
    currrentLampCount++;
  }

  POSITIONS_ARRAY[i * 3 + 0] =
    (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][0];
  POSITIONS_ARRAY[i * 3 + 1] =
    (Math.random() - 0.5) * 0.3 + FIREFLIES_POSITIONS[currrentLampCount - 1][1];
  POSITIONS_ARRAY[i * 3 + 2] =
    (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][2];
  SCALES_ARRAY[i] = Math.random() * 0.5 + 0.5;
}

const FireFlies = () => {
  const width = useThree(state => state.size.width);
  const height = useThree(state => state.size.height);
  const pixelRatio = useThree(state => state.viewport.dpr);

  const firefliesRef = useRef();

  const controls = useControls(
    'FireFlies',
    {
      color: {
        value: FIREFLIES_COLOR,
      },
      intensity: {
        value: FIREFLIES_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
      },
      size: {
        value: FIREFLIES_SIZE,
        min: 0,
        max: 0.2,
        step: 0.001,
      },
    },
    { collapsed: true }
  );

  // Created once: the resolution effect below keeps uResolution fresh, so
  // a dpr change (adaptive 1 <-> 2) no longer rebuilds the material class
  // and recompiles the shader
  const FirefliesShaderMaterial = useMemo(
    () =>
      shaderMaterial(
        {
          uResolution: new THREE.Vector2(
            width * pixelRatio,
            height * pixelRatio
          ),
          uSize: FIREFLIES_SIZE,
          uTime: 0,
          uVelocity: 0.17,
          uColor: new THREE.Color(FIREFLIES_COLOR),
          uIntensity: FIREFLIES_INTENSITY,
        },
        firefliesVertexShader,
        firefliesFragmentShader
      ),
    []
  );

  extend({ FirefliesShaderMaterial });

  // Resolution only changes on resize / dpr switch, not per frame
  useEffect(() => {
    firefliesRef.current?.uniforms.uResolution.value.set(
      width * pixelRatio,
      height * pixelRatio
    );
  }, [width, height, pixelRatio]);

  useFrame(({ clock }) => {
    firefliesRef.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={TOTAL_FIREFLIES_COUNT}
          array={POSITIONS_ARRAY}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aScale"
          count={TOTAL_FIREFLIES_COUNT}
          array={SCALES_ARRAY}
          itemSize={1}
        />
      </bufferGeometry>
      <firefliesShaderMaterial
        ref={firefliesRef}
        uColor={controls.color}
        uIntensity={controls.intensity}
        uSize={controls.size}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
};

export default FireFlies;
