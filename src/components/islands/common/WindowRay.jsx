import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

import { useControls } from '#utils/useControls.jsx';

import windowRayVertexShader from '#shaders/windowRay/vertex.glsl';
import windowRayFragmentShader from '#shaders/windowRay/fragment.glsl';

import windowRayModel from '#assets/models/island/windowRay.glb?url';

const RAY_COLOR = '#f2b183';
const RAY_OPACITY = 0.66;
const RAY_START = 1;
const RAY_END = 0.36;
const RAY_SMOOTHNESS = 5;
const RAY_EDGE_SMOOTHNESS = 0.36;

const WindowRay = () => {
  const { nodes } = useGLTF(windowRayModel);

  const shaderMaterialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(RAY_COLOR) },
      uOpacity: { value: RAY_OPACITY },
      uStart: { value: RAY_START },
      uEnd: { value: RAY_END },
      uSmoothness: { value: RAY_SMOOTHNESS },
      uEdgeSmoothness: { value: RAY_EDGE_SMOOTHNESS },
    }),
    []
  );

  useControls(
    'WindowRay',
    {
      color: {
        value: RAY_COLOR,
        onChange: value => {
          shaderMaterialRef.current?.uniforms.uColor.value.set(value);
        },
      },
      opacity: {
        value: RAY_OPACITY,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uOpacity.value = value;
          }
        },
      },
      start: {
        value: RAY_START,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uStart.value = value;
          }
        },
      },
      end: {
        value: RAY_END,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uEnd.value = value;
          }
        },
      },
      smoothness: {
        value: RAY_SMOOTHNESS,
        min: 0.1,
        max: 5,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uSmoothness.value = value;
          }
        },
      },
      edgeSmoothness: {
        value: RAY_EDGE_SMOOTHNESS,
        min: 0.01,
        max: 0.5,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uEdgeSmoothness.value = value;
          }
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return (
    <mesh geometry={nodes.windowRay.geometry}>
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={windowRayVertexShader}
        fragmentShader={windowRayFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        
      />
    </mesh>
  );
};

useGLTF.preload(windowRayModel);

export { WindowRay };
