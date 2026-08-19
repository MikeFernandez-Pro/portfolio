import { useEffect, useMemo, useRef } from 'react';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

import spiralVertexShader from '#shaders/spiral/vertex.glsl';
import spiralFragmentShader from '#shaders/spiral/fragment.glsl';

import spiralModel from '#assets/models/island/Spiral.glb?url';
import spiralTextureImage from '#assets/textures/spiralTexture.png';

import { useStore } from '#store/ZustandStorage.jsx';
import { RESPAWN_DEFAULTS } from '#controller/respawnAnimation.js';

// Character spawn position (see CharacterController respawn)
const SPAWN_POSITION = [0.0, 0.55, 0];

const Spiral = () => {
  const materialRef = useRef(null);
  const meshRef = useRef(null);

  const { nodes } = useGLTF(spiralModel);

  const spiralTexture = useTexture(spiralTextureImage, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
  });

  const uniforms = useMemo(
    () => ({
      uTexture: { value: spiralTexture },
      uUvOffsetX: { value: 0 },
      uColor: { value: new THREE.Color(RESPAWN_DEFAULTS.spiralColor) },
      uEmissiveIntensity: { value: RESPAWN_DEFAULTS.spiralEmissive },
    }),
    [spiralTexture]
  );

  // Expose the uniforms + mesh so the shared respawn timeline can drive the
  // uv.x sweep and toggle visibility (hidden at rest)
  useEffect(() => {
    if (!materialRef.current || !meshRef.current) return;

    useStore.setState({
      spiralRespawnUniforms: materialRef.current.uniforms,
      spiralRespawnMesh: meshRef.current,
    });

    return () => {
      useStore.setState({
        spiralRespawnUniforms: null,
        spiralRespawnMesh: null,
      });
    };
  }, []);

  return (
    <mesh
      ref={meshRef}
      geometry={nodes.Spiral.geometry}
      position={SPAWN_POSITION}
      scale={0.2}
      rotation-y={0.8}
      renderOrder={1}
      visible={false}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={spiralVertexShader}
        fragmentShader={spiralFragmentShader}
        uniforms={uniforms}
        transparent={true}
        side={THREE.DoubleSide}
        depthWrite={false}
        alphaTest={0.0}
      />
    </mesh>
  );
};

useGLTF.preload(spiralModel);
useTexture.preload(spiralTextureImage);

export { Spiral };
