import { useMemo } from 'react';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import * as THREE from 'three';

import sparksVertexShader from '#shaders/sparks/vertex.glsl';
import sparksFragmentShader from '#shaders/sparks/fragment.glsl';

const SPEED = 6;
const COLOR = '#f85f3d';
const INTENSITY = 0.78;

const SparksMaterial = ({ size, color = COLOR, intensity = INTENSITY }) => {
  const SparksShaderMaterial = useMemo(
    () =>
      shaderMaterial(
        {
          uTime: 0,
          uSize: size,
          uSpeed: SPEED,
          uColor: new THREE.Color(COLOR),
          uIntensity: INTENSITY,
          uResolution: new THREE.Vector2(),
        },
        sparksVertexShader,
        sparksFragmentShader
      ),
    []
  );

  extend({ SparksShaderMaterial });

  return (
    <sparksShaderMaterial
      uSize={size}
      uColor={color}
      uIntensity={intensity}
      depthWrite={false}
      blending={THREE.AdditiveBlending}
      vertexColors={true}
      toneMapped={false}
    />
  );
};

export default SparksMaterial;
export { COLOR as SPARKS_COLOR, INTENSITY as SPARKS_INTENSITY };
