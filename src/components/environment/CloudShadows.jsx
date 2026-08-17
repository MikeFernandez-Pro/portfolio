import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

import { useControls } from '#utils/useControls.jsx';
import cloudShadowsChunk from '#shaders/includes/cloudShadows.glsl';
import perlinNoiseImage from '#assets/textures/perlin.png';

const CLOUD_SHADOW_DEFAULTS = {
  enabled: true,
  direction: 2.08,
  speed: 0.0051,
  scale: 0.013,
  layers: 2,
  coverage: 0.4,
  softness: 0.013,
  darkness: 0.70,
  power: 1.5,
};

// Shared by every material that receives cloud shadows (island patch, grass)
const cloudShadowUniforms = {
  uCloudShadowEnabled: { value: CLOUD_SHADOW_DEFAULTS.enabled ? 1 : 0 },
  uCloudShadowTime: { value: 0 },
  uCloudShadowDirection: {
    value: new THREE.Vector2(
      Math.cos(CLOUD_SHADOW_DEFAULTS.direction),
      Math.sin(CLOUD_SHADOW_DEFAULTS.direction)
    ),
  },
  uCloudShadowSpeed: { value: CLOUD_SHADOW_DEFAULTS.speed },
  uCloudShadowScale: { value: CLOUD_SHADOW_DEFAULTS.scale },
  uCloudShadowLayers: { value: CLOUD_SHADOW_DEFAULTS.layers },
  uCloudShadowCoverage: { value: CLOUD_SHADOW_DEFAULTS.coverage },
  uCloudShadowSoftness: { value: CLOUD_SHADOW_DEFAULTS.softness },
  uCloudShadowDarkness: { value: CLOUD_SHADOW_DEFAULTS.darkness },
  uCloudShadowPower: { value: CLOUD_SHADOW_DEFAULTS.power },
  uCloudShadowNoise: { value: null },
};

/**
 * Injects the cloud shadow darkening into a built-in three.js material
 * (e.g. the GLB island texture material).
 */
const patchCloudShadows = material => {
  const previousOnBeforeCompile = material.onBeforeCompile;

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile?.call(material, shader, renderer);

    Object.assign(shader.uniforms, cloudShadowUniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vCloudWorldPos;'
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvCloudWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>\nvarying vec3 vCloudWorldPos;\n${cloudShadowsChunk}`
      )
      .replace(
        '#include <dithering_fragment>',
        'gl_FragColor.rgb *= cloudShadowFactor(vCloudWorldPos.xz);\n#include <dithering_fragment>'
      );
  };
  material.needsUpdate = true;
};

/**
 * Drives the shared cloud shadow uniforms: noise texture, time and controls.
 */
const CloudShadows = () => {
  const perlinNoiseTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  useEffect(() => {
    cloudShadowUniforms.uCloudShadowNoise.value = perlinNoiseTexture;
  }, [perlinNoiseTexture]);

  useControls(
    'Cloud Shadows',
    {
      enabled: {
        value: CLOUD_SHADOW_DEFAULTS.enabled,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowEnabled.value = value ? 1 : 0;
        },
      },
      direction: {
        value: CLOUD_SHADOW_DEFAULTS.direction,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowDirection.value.set(
            Math.cos(value),
            Math.sin(value)
          );
        },
      },
      speed: {
        value: CLOUD_SHADOW_DEFAULTS.speed,
        min: 0,
        max: 0.05,
        step: 0.0001,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowSpeed.value = value;
        },
      },
      scale: {
        value: CLOUD_SHADOW_DEFAULTS.scale,
        min: 0.001,
        max: 0.05,
        step: 0.001,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowScale.value = value;
        },
      },
      layers: {
        value: CLOUD_SHADOW_DEFAULTS.layers,
        min: 1,
        max: 6,
        step: 1,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowLayers.value = value;
        },
      },
      coverage: {
        value: CLOUD_SHADOW_DEFAULTS.coverage,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowCoverage.value = value;
        },
      },
      softness: {
        value: CLOUD_SHADOW_DEFAULTS.softness,
        min: 0,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowSoftness.value = value;
        },
      },
      darkness: {
        value: CLOUD_SHADOW_DEFAULTS.darkness,
        min: 0,
        max: 1,
        step: 0.01,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowDarkness.value = value;
        },
      },
      power: {
        value: CLOUD_SHADOW_DEFAULTS.power,
        min: 0.1,
        max: 4,
        step: 0.1,
        onChange: value => {
          cloudShadowUniforms.uCloudShadowPower.value = value;
        },
      },
    },
    { collapsed: true }
  );

  useFrame(({ clock }) => {
    cloudShadowUniforms.uCloudShadowTime.value = clock.elapsedTime;
  });

  return null;
};

useTexture.preload(perlinNoiseImage);

export { CloudShadows, cloudShadowUniforms, patchCloudShadows };
