import { useEffect } from 'react';
import * as THREE from 'three';
import { Discard, Fn, If, materialColor, mix, uniform, vec4 } from 'three/tsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { toNodeMaterial } from '#utils/nodeMaterials.js';
import {
  createDissolveUniforms,
  dissolveLava,
} from '#shaders/character/dissolve.js';
import { patchIslandPointLights } from '#islands/common/islandPointLights.js';
import { patchCloudShadows } from '#environment/CloudShadows.jsx';
import { useStore } from '#store/ZustandStorage.jsx';

const CHARACTER_MATERIAL_NAME = 'knight';
const BOUNDS_MIN = new THREE.Vector3(-3.34, 0, -2.41);
const BOUNDS_MAX = new THREE.Vector3(3.34, 5.94, 0.73);

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

    const uniforms = createDissolveUniforms(noiseTexture);

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
    patchIslandPointLights(material);

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
