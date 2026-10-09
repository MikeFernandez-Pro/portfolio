import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei/webgpu';
import * as THREE from 'three/webgpu';
import { max, texture, uniform, uv, vec2 } from 'three/tsl';

import spiralModel from '#assets/models/island/Spiral.glb?url';
import { useSpiralGrassHeightTexture } from '#utils/packedTextures.js';

import { useStore } from '#store';
import { RESPAWN_DEFAULTS } from '#character/deathCycle/respawnAnimation.js';

// Character spawn position (see CharacterController respawn)
const SPAWN_POSITION = [0.0, 0.55, 0];

const Spiral = () => {
  const meshRef = useRef(null);

  const { nodes } = useGLTF(spiralModel);

  // Spiral mask lives in the red channel of the packed texture
  const spiralTexture = useSpiralGrassHeightTexture();

  const { material, uniforms } = useMemo(() => {
    // TSL uniform nodes: the respawn timeline tweens their .value
    const uniforms = {
      uUvOffsetX: uniform(0),
      uColor: uniform(new THREE.Color(RESPAWN_DEFAULTS.spiralColor)),
      uEmissiveIntensity: uniform(RESPAWN_DEFAULTS.spiralEmissive),
    };

    const material = new THREE.MeshBasicNodeMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // The uv.x sweep slides the mask along the spiral
    const spiral = texture(
      spiralTexture,
      vec2(uv().x.add(uniforms.uUvOffsetX), uv().y)
    ).r;
    material.colorNode = uniforms.uColor.mul(uniforms.uEmissiveIntensity);
    material.opacityNode = max(0, spiral.sub(0.1));

    return { material, uniforms };
  }, [spiralTexture]);

  useEffect(() => () => material.dispose(), [material]);

  // Expose the uniforms + mesh so the shared respawn timeline can drive the
  // uv.x sweep and toggle visibility (hidden at rest)
  useEffect(() => {
    if (!meshRef.current) return;

    useStore.setState({
      spiralRespawnUniforms: uniforms,
      spiralRespawnMesh: meshRef.current,
    });

    return () => {
      useStore.setState({
        spiralRespawnUniforms: null,
        spiralRespawnMesh: null,
      });
    };
  }, [uniforms]);

  return (
    <mesh
      ref={meshRef}
      geometry={nodes.Spiral.geometry}
      material={material}
      position={SPAWN_POSITION}
      scale={0.2}
      rotation-y={0.8}
      renderOrder={1}
      visible={false}
    />
  );
};

useGLTF.preload(spiralModel);

export { Spiral };
