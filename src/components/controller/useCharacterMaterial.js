import { useEffect } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { useTexture } from '@react-three/drei';

import voronoiImage from '#assets/textures/voronoi.webp';
import vertexShader from '#shaders/character/vertex.glsl';
import fragmentShader from '#shaders/character/fragment.glsl';
import { patchIslandPointLights } from '#islands/common/islandPointLights.js';
import { patchCloudShadows } from '#environment/CloudShadows.jsx';
import { useStore } from '#store/ZustandStorage.jsx';
import { RESPAWN_DEFAULTS } from '#controller/respawnAnimation.js';

const CHARACTER_MATERIAL_NAME = 'knight';
const BOUNDS_MIN = new THREE.Vector3(-3.34, 0, -2.41);
const BOUNDS_MAX = new THREE.Vector3(3.34, 5.94, 0.73);

const useCharacterMaterial = characterScene => {
  const voronoiTexture = useTexture(voronoiImage, texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
  });

  useEffect(() => {
    if (!characterScene) {
      return;
    }

    const characterMesh = characterScene.getObjectByName(
      CHARACTER_MATERIAL_NAME
    );

    if (!characterMesh || !voronoiTexture) {
      return;
    }

    new CustomShaderMaterial({
      baseMaterial: characterMesh.material,
      uniforms: {
        uVoronoiTexture: { value: voronoiTexture },
        uBoundsMin: { value: BOUNDS_MIN },
        uBoundsMax: { value: BOUNDS_MAX },
        uColor: { value: new THREE.Color(RESPAWN_DEFAULTS.charColor) },
        uIntensity: { value: RESPAWN_DEFAULTS.charIntensity },
        uRepeat: { value: RESPAWN_DEFAULTS.charRepeat },
        uThickness: { value: RESPAWN_DEFAULTS.charThickness },
        uProgress: { value: 0 },
        uCharFormProgress: { value: 1 },
        uAlphaClip: { value: RESPAWN_DEFAULTS.alphaClip },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      tonemapped: false,
      side: THREE.DoubleSide,
      // Keep depth writing (avoids self-sorting holes on the DoubleSide model);
      // the shader discards near-transparent fragments so no silhouette shows
      depthWrite: true,
    });

    // CSM v6 mutates the base material in place; chain the cloud shadows
    // and the fake island point lights on top so passing clouds darken the
    // character and torches, lanterns and portals light it as it walks by
    patchCloudShadows(characterMesh.material);
    patchIslandPointLights(characterMesh.material);

    // Expose the respawn uniforms so the shared timeline can drive them
    useStore.setState({
      characterRespawnUniforms: characterMesh.material.uniforms,
    });

    return () => {
      useStore.setState({ characterRespawnUniforms: null });
    };
  }, [characterScene, voronoiTexture]);
};

export { useCharacterMaterial };
