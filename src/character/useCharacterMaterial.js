import { useEffect } from 'react';
import * as THREE from 'three/webgpu';
import { Discard, Fn, If, materialColor, mix, uniform, vec4 } from 'three/tsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';
import { createDissolveUniforms, dissolveLava } from '#shaders/dissolve.js';
import { patchPointLights } from '#islands/world/pointLights/pointLights.js';
import { patchCloudShadows } from '#shaders/cloudShadows.js';
import { useStore } from '#store';
import { RESPAWN_DEFAULTS } from '#character/deathCycle/respawnAnimation.js';

const CHARACTER_MATERIAL_NAME = 'knight';
const BOUNDS_MIN = new THREE.Vector3(-3.34, 0, -2.41);
const BOUNDS_MAX = new THREE.Vector3(3.34, 5.94, 0.73);

const CHARACTER_DISSOLVE = {
  color: RESPAWN_DEFAULTS.charColor,
  intensity: RESPAWN_DEFAULTS.charIntensity,
  repeat: RESPAWN_DEFAULTS.charRepeat,
  perlinScale: RESPAWN_DEFAULTS.charPerlinScale,
  perlinStrength: RESPAWN_DEFAULTS.charPerlinStrength,
  perlinSpeed: RESPAWN_DEFAULTS.charPerlinSpeed,
  thickness: RESPAWN_DEFAULTS.charThickness,
};

const useCharacterMaterial = characterScene => {
  // Voronoi (R) and perlin (G) share one packed texture (the lantern
  // material reuses the knight's dissolve uniforms too)
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

    // Shared by the knight and its lantern: the death and respawn timelines
    // tween these, so both dissolve in sync
    const uniforms = {
      ...createDissolveUniforms(noiseTexture, CHARACTER_DISSOLVE),
      // 0 = only lava, 1 = formed character
      uCharFormProgress: uniform(1),
      // discard fragments below this alpha (no depth write)
      uAlphaClip: uniform(RESPAWN_DEFAULTS.alphaClip),
    };

    const material = toNodeMaterial(characterMesh.material);
    material.transparent = true;
    material.side = THREE.DoubleSide;
    material.depthWrite = true;

    // Lava dissolve mixed over the knight's own color (map included)
    const lava = dissolveLava(
      uniforms,
      uniform(BOUNDS_MIN),
      uniform(BOUNDS_MAX)
    );
    material.colorNode = Fn(() => {
      const color = mix(
        lava,
        materialColor,
        uniforms.uCharFormProgress
      ).toVar();
      If(color.a.lessThan(uniforms.uAlphaClip), () => {
        Discard();
      });
      return vec4(color);
    })();

    patchCloudShadows(material);
    patchPointLights(material);

    const previousMaterial = characterMesh.material;
    characterMesh.material = material;

    useStore.setState({ characterRespawnUniforms: uniforms });

    return () => {
      characterMesh.material = previousMaterial;
      material.dispose();
      useStore.setState({ characterRespawnUniforms: null });
    };
  }, [characterScene, noiseTexture]);
};

export { useCharacterMaterial };
