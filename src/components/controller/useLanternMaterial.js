import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import vertexShader from '#shaders/characterLantern/vertex.glsl';
import fragmentShader from '#shaders/characterLantern/fragment.glsl';
import { patchIslandPointLights } from '#islands/common/islandPointLights.js';
import { patchCloudShadows } from '#environment/CloudShadows.jsx';
import { useControls } from '#utils/useControls.jsx';

const CHARACTER_MATERIAL_NAME = 'knight';
// Lantern geometry bounds (origin at the top attachment loop)
const BOUNDS_MIN = new THREE.Vector3(-0.39, -1.07, -0.39);
const BOUNDS_MAX = new THREE.Vector3(0.39, 0.08, 0.39);

// The lantern vertex colors are part markers (black / white / red), each
// part gets its own display color; the white part also glows
const COLOR_DEFAULTS = {
  blackColor: '#4e4e4e',
  whiteColor: '#91ffd0',
  whiteIntensity: 3.6,
  redColor: '#353535',
  roughness: 0.55,
  metalness: 0.35,
};

// The lantern glb ships without a material. Build one mirroring the knight
// setup (CustomShaderMaterial + cloud shadow / island point light patches)
// and reuse the knight's uniform OBJECTS: the respawn timeline tweens those,
// so the lantern dissolves/reforms in sync with the character for free.
const useLanternMaterial = (characterScene, lanternMeshRef) => {
  const materialRef = useRef(null);

  useEffect(() => {
    const lanternMesh = lanternMeshRef.current;
    const knightMesh = characterScene?.getObjectByName(CHARACTER_MATERIAL_NAME);
    // Set up by useCharacterMaterial, which runs first (hook call order)
    const shared = knightMesh?.material?.uniforms;

    if (!lanternMesh || !shared) {
      return;
    }

    const material = new THREE.MeshStandardMaterial({
      roughness: COLOR_DEFAULTS.roughness,
      metalness: COLOR_DEFAULTS.metalness,
    });

    // CSM mutates the base material in place (same pattern as the knight)
    new CustomShaderMaterial({
      baseMaterial: material,
      uniforms: {
        // Shared with the knight material (same uniform instances)
        uVoronoiTexture: shared.uVoronoiTexture,
        uPerlinTexture: shared.uPerlinTexture,
        uColor: shared.uColor,
        uIntensity: shared.uIntensity,
        uRepeat: shared.uRepeat,
        uPerlinScale: shared.uPerlinScale,
        uPerlinStrength: shared.uPerlinStrength,
        uPerlinSpeed: shared.uPerlinSpeed,
        uTime: shared.uTime,
        uThickness: shared.uThickness,
        uProgress: shared.uProgress,
        uCharFormProgress: shared.uCharFormProgress,
        uAlphaClip: shared.uAlphaClip,
        // Own bounds (vertex position normalization) and per-part colors
        uBoundsMin: { value: BOUNDS_MIN },
        uBoundsMax: { value: BOUNDS_MAX },
        uBlackColor: { value: new THREE.Color(COLOR_DEFAULTS.blackColor) },
        uWhiteColor: { value: new THREE.Color(COLOR_DEFAULTS.whiteColor) },
        uWhiteIntensity: { value: COLOR_DEFAULTS.whiteIntensity },
        uRedColor: { value: new THREE.Color(COLOR_DEFAULTS.redColor) },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      tonemapped: false,
      side: THREE.DoubleSide,
      depthWrite: true,
    });

    patchCloudShadows(material);
    patchIslandPointLights(material);

    // The white-marked part is unlit, like the head orb: constant
    // color * intensity, immune to lights, cloud shadows and tone mapping.
    // Chained last so the override lands after every other patch; only the
    // respawn dissolve still fades it (uCharFormProgress gate).
    // Clamp: MSAA can extrapolate vPartMask past 0–1 and bloom those samples.
    const previousOnBeforeCompile = material.onBeforeCompile;
    material.onBeforeCompile = (shader, renderer) => {
      previousOnBeforeCompile?.call(material, shader, renderer);

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        `#include <dithering_fragment>
vec3 unlitWhite = linearToOutputTexel(vec4(uWhiteColor * uWhiteIntensity, 1.0)).rgb;
gl_FragColor.rgb = mix(gl_FragColor.rgb, unlitWhite, clamp(vPartMask.g, 0.0, 1.0) * uCharFormProgress);`
      );
    };

    lanternMesh.material = material;
    materialRef.current = material;

    return () => {
      materialRef.current = null;
      material.dispose();
    };
  }, [characterScene]);

  useControls(
    'LanternColors',
    {
      blackColor: {
        value: COLOR_DEFAULTS.blackColor,
        onChange: v => materialRef.current?.uniforms.uBlackColor.value.set(v),
      },
      whiteColor: {
        value: COLOR_DEFAULTS.whiteColor,
        onChange: v => materialRef.current?.uniforms.uWhiteColor.value.set(v),
      },
      whiteIntensity: {
        value: COLOR_DEFAULTS.whiteIntensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          if (materialRef.current)
            materialRef.current.uniforms.uWhiteIntensity.value = v;
        },
      },
      redColor: {
        value: COLOR_DEFAULTS.redColor,
        onChange: v => materialRef.current?.uniforms.uRedColor.value.set(v),
      },
      roughness: {
        value: COLOR_DEFAULTS.roughness,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: v => {
          if (materialRef.current) materialRef.current.roughness = v;
        },
      },
      metalness: {
        value: COLOR_DEFAULTS.metalness,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: v => {
          if (materialRef.current) materialRef.current.metalness = v;
        },
      },
    },
    { collapsed: true, reset: true }
  );
};

export { useLanternMaterial };
