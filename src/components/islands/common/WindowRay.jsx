import { useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

import { useControls } from '#utils/useControls.jsx';

import windowRayVertexShader from '#shaders/windowRay/vertex.glsl';
import windowRayFragmentShader from '#shaders/windowRay/fragment.glsl';

import windowRayModel from '#assets/models/island/windowRay.glb?url';

const RAY_COLOR = '#f2b183';
const RAY_OPACITY = 0.5;
const RAY_START = 1;
const RAY_END = 0.36;
const RAY_SMOOTHNESS = 5;
const RAY_EDGE_SMOOTHNESS = 0.01;
const RAY_ANGLE_FADE_STRENGTH = 0.7;
const RAY_ANGLE_FADE_POWER = 1.5;

const WindowRay = () => {
  const { nodes } = useGLTF(windowRayModel);

  // Shade smooth: the GLB ships flat (split) normals, useless for the
  // view-angle fade. The UVs differ per face so mergeVertices alone can't
  // weld across them — weld a copy stripped of uv/normal, rebuild smooth
  // normals on it, then copy them back onto the original (UV'd) layout by
  // matching vertex positions
  const geometry = useMemo(() => {
    const source = nodes.windowRay.geometry;

    const stripped = source.clone();
    stripped.deleteAttribute('uv');
    stripped.deleteAttribute('normal');
    const welded = mergeVertices(stripped);
    welded.computeVertexNormals();

    const positionKey = (attribute, i) =>
      `${attribute.getX(i).toFixed(4)},${attribute.getY(i).toFixed(4)},${attribute.getZ(i).toFixed(4)}`;

    const weldedIndexByPosition = new Map();
    for (let i = 0; i < welded.attributes.position.count; i++) {
      weldedIndexByPosition.set(
        positionKey(welded.attributes.position, i),
        i
      );
    }

    const smooth = source.clone();
    const normalAttribute = smooth.attributes.normal;
    for (let i = 0; i < smooth.attributes.position.count; i++) {
      const j = weldedIndexByPosition.get(
        positionKey(smooth.attributes.position, i)
      );
      if (j !== undefined) {
        normalAttribute.setXYZ(
          i,
          welded.attributes.normal.getX(j),
          welded.attributes.normal.getY(j),
          welded.attributes.normal.getZ(j)
        );
      }
    }
    normalAttribute.needsUpdate = true;
    return smooth;
  }, [nodes]);

  const shaderMaterialRef = useRef();

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color(RAY_COLOR) },
      uOpacity: { value: RAY_OPACITY },
      uStart: { value: RAY_START },
      uEnd: { value: RAY_END },
      uSmoothness: { value: RAY_SMOOTHNESS },
      uEdgeSmoothness: { value: RAY_EDGE_SMOOTHNESS },
      uAngleFadeStrength: { value: RAY_ANGLE_FADE_STRENGTH },
      uAngleFadePower: { value: RAY_ANGLE_FADE_POWER },
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
      // View-angle fade hiding the beam's hard corners: strength blends the
      // effect in (0 = off), power shapes how fast grazing faces melt away
      angleFadeStrength: {
        value: RAY_ANGLE_FADE_STRENGTH,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uAngleFadeStrength.value =
              value;
          }
        },
      },
      angleFadePower: {
        value: RAY_ANGLE_FADE_POWER,
        min: 0.1,
        max: 8,
        step: 0.01,
        onChange: value => {
          if (shaderMaterialRef.current) {
            shaderMaterialRef.current.uniforms.uAngleFadePower.value = value;
          }
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return (
    <mesh geometry={geometry}>
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
