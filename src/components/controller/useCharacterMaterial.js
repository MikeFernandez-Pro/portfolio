import { useEffect } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
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
  // Voronoi (R) and perlin (G) share one packed texture; both sampler
  // uniforms point at it (the lantern material reuses these uniforms too)
  const noiseTexture = useVoronoiPerlinTexture();

  useEffect(() => {
    if (!characterScene) {
      return;
    }

    const characterMesh = characterScene.getObjectByName(
      CHARACTER_MATERIAL_NAME
    );

    if (!characterMesh || !noiseTexture) {
      return;
    }

    new CustomShaderMaterial({
      baseMaterial: characterMesh.material,
      uniforms: {
        uVoronoiTexture: { value: noiseTexture },
        uPerlinTexture: { value: noiseTexture },
        uBoundsMin: { value: BOUNDS_MIN },
        uBoundsMax: { value: BOUNDS_MAX },
        uColor: { value: new THREE.Color(RESPAWN_DEFAULTS.charColor) },
        uIntensity: { value: RESPAWN_DEFAULTS.charIntensity },
        uRepeat: { value: RESPAWN_DEFAULTS.charRepeat },
        uPerlinScale: { value: RESPAWN_DEFAULTS.charPerlinScale },
        uPerlinStrength: { value: RESPAWN_DEFAULTS.charPerlinStrength },
        uPerlinSpeed: { value: RESPAWN_DEFAULTS.charPerlinSpeed },
        uTime: { value: 0 },
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
      depthWrite: true,
    });

    patchCloudShadows(characterMesh.material);
    patchIslandPointLights(characterMesh.material);

    useStore.setState({
      characterRespawnUniforms: characterMesh.material.uniforms,
    });

    return () => {
      useStore.setState({ characterRespawnUniforms: null });
    };
  }, [characterScene, noiseTexture]);
};

export { useCharacterMaterial };
