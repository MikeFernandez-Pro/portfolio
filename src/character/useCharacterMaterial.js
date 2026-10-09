import { useEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import { Discard, Fn, If, materialColor, mix, uniform, vec4 } from 'three/tsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';
import { createDissolveUniforms, dissolveLava } from '#shaders/dissolve.js';
import { patchPointLights } from '#islands/world/pointLights/pointLights.js';
import { patchCloudShadows } from '#shaders/cloudShadows.js';
import { RESPAWN_DEFAULTS } from '#character/deathCycle/respawnAnimation.js';
import { registerDissolve } from '#character/deathCycle/deathCycle.js';

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

/**
 * The knight's node material (dissolve, cloud shadows, point lights).
 * Returns the dissolve uniforms: the lantern and head orb follow them, and
 * the death cycle tweens them, so all dissolve in sync.
 */
const useCharacterMaterial = characterScene => {
  // Voronoi (R) and perlin (G) share one packed texture
  const noiseTexture = useVoronoiPerlinTexture();

  const uniforms = useMemo(
    () => ({
      ...createDissolveUniforms(noiseTexture, CHARACTER_DISSOLVE),
      // 0 = only lava, 1 = formed character
      uCharFormProgress: uniform(1),
      // discard fragments below this alpha (no depth write)
      uAlphaClip: uniform(RESPAWN_DEFAULTS.alphaClip),
    }),
    [noiseTexture]
  );

  useEffect(() => registerDissolve(uniforms), [uniforms]);

  useEffect(() => {
    if (!characterScene) {
      return;
    }

    const characterMesh = characterScene.getObjectByName(
      CHARACTER_MATERIAL_NAME
    );

    if (!characterMesh) {
      return;
    }

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

    return () => {
      characterMesh.material = previousMaterial;
      material.dispose();
    };
  }, [characterScene, uniforms]);

  return uniforms;
};

export { useCharacterMaterial };
