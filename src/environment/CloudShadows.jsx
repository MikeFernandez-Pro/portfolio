import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  Break,
  Fn,
  If,
  Loop,
  clamp,
  float,
  max,
  mix,
  output,
  positionWorld,
  pow,
  smoothstep,
  texture,
  uniform,
  vec2,
  vec4,
} from 'three/tsl';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import { usePerlinCloudsTexture } from '#utils/packedTextures.js';

const CLOUD_SHADOW_DEFAULTS = {
  enabled: true,
  direction: 2.08,
  speed: 0.0051,
  scale: 0.013,
  layers: 2,
  coverage: 0.4,
  softness: 0.025,
  darkness: 0.76,
  power: 1.5,
};

const MAX_CLOUD_SHADOW_LAYERS = 6;

// Shared by every material that receives cloud shadows (island, character,
// lantern, grass). TSL uniform nodes: `.value` works like the old objects
const cloudShadowUniforms = {
  uCloudShadowEnabled: uniform(CLOUD_SHADOW_DEFAULTS.enabled ? 1 : 0),
  uCloudShadowTime: uniform(0),
  uCloudShadowDirection: uniform(
    new THREE.Vector2(
      Math.cos(CLOUD_SHADOW_DEFAULTS.direction),
      Math.sin(CLOUD_SHADOW_DEFAULTS.direction)
    )
  ),
  uCloudShadowSpeed: uniform(CLOUD_SHADOW_DEFAULTS.speed),
  uCloudShadowScale: uniform(CLOUD_SHADOW_DEFAULTS.scale),
  uCloudShadowLayers: uniform(CLOUD_SHADOW_DEFAULTS.layers),
  uCloudShadowCoverage: uniform(CLOUD_SHADOW_DEFAULTS.coverage),
  uCloudShadowSoftness: uniform(CLOUD_SHADOW_DEFAULTS.softness),
  uCloudShadowDarkness: uniform(CLOUD_SHADOW_DEFAULTS.darkness),
  uCloudShadowPower: uniform(CLOUD_SHADOW_DEFAULTS.power),
  // Placeholder until <CloudShadows> swaps in the loaded perlin texture
  uCloudShadowNoise: texture(new THREE.Texture()),
};

/**
 * Cloud shadows: layered perlin noise scrolled over world XZ. Returns the
 * darkening factor (1 = lit) for a world-space XZ position.
 */
const cloudShadowFactor = /*@__PURE__*/ Fn(([worldXZ]) => {
  const u = cloudShadowUniforms;
  const factor = float(1).toVar();

  If(u.uCloudShadowEnabled.greaterThan(0.5), () => {
    const cloudUv = worldXZ
      .mul(u.uCloudShadowScale)
      .add(
        u.uCloudShadowDirection.mul(u.uCloudShadowTime.mul(u.uCloudShadowSpeed))
      );

    const cloudField = float(0).toVar();
    const cloudWeight = float(0).toVar();
    const layerWeight = float(1).toVar();
    const layerUv = vec2(cloudUv).toVar();

    Loop(MAX_CLOUD_SHADOW_LAYERS, ({ i }) => {
      const layer = float(i);
      If(layer.greaterThanEqual(u.uCloudShadowLayers), () => {
        Break();
      });

      const cUv = layerUv.add(vec2(17.31, 9.17).mul(layer));
      // standalone 512 perlin (grayscale — any channel works)
      cloudField.addAssign(u.uCloudShadowNoise.sample(cUv).r.mul(layerWeight));
      cloudWeight.addAssign(layerWeight);
      layerWeight.mulAssign(0.5);
      layerUv.mulAssign(2);
    });

    const field = clamp(cloudField.div(max(cloudWeight, 0.0001)), 0, 1);

    const inShadow = float(1).sub(
      smoothstep(
        clamp(u.uCloudShadowCoverage.sub(u.uCloudShadowSoftness), 0, 1),
        clamp(u.uCloudShadowCoverage.add(u.uCloudShadowSoftness), 0, 1),
        field
      )
    );

    const shade = mix(1, clamp(u.uCloudShadowDarkness, 0, 1), inShadow);

    factor.assign(pow(shade, max(u.uCloudShadowPower, 0.001)));
  });

  return factor;
});

/**
 * Darkens a node material's final color (after lighting and fog) under the
 * clouds. Idempotent. Classic (non-node) materials are skipped: they don't
 * render under WebGPU anyway.
 */
const patchCloudShadows = material => {
  if (!material.isNodeMaterial || material.userData.cloudShadows) return;
  material.userData.cloudShadows = true;

  const baseOutput = material.outputNode ?? output;
  material.outputNode = vec4(
    baseOutput.rgb.mul(cloudShadowFactor(positionWorld.xz)),
    baseOutput.a
  );
  material.needsUpdate = true;
};

/**
 * Drives the shared cloud shadow uniforms: noise texture, time and controls.
 */
const CloudShadows = () => {
  // Standalone 512 perlin bake: the packed 128 copy pixelates at cloud
  // magnification
  const perlinNoiseTexture = usePerlinCloudsTexture();

  useEffect(() => {
    cloudShadowUniforms.uCloudShadowNoise.value = perlinNoiseTexture;
  }, [perlinNoiseTexture]);

  const cloudShadowControl = uniformControls(cloudShadowUniforms);
  useControls('Cloud Shadows', {
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
    speed: cloudShadowControl(
      'uCloudShadowSpeed',
      CLOUD_SHADOW_DEFAULTS.speed,
      0,
      0.05,
      0.0001
    ),
    scale: cloudShadowControl(
      'uCloudShadowScale',
      CLOUD_SHADOW_DEFAULTS.scale,
      0.001,
      0.05,
      0.001
    ),
    layers: cloudShadowControl(
      'uCloudShadowLayers',
      CLOUD_SHADOW_DEFAULTS.layers,
      1,
      6,
      1
    ),
    coverage: cloudShadowControl(
      'uCloudShadowCoverage',
      CLOUD_SHADOW_DEFAULTS.coverage,
      0,
      1,
      0.01
    ),
    softness: cloudShadowControl(
      'uCloudShadowSoftness',
      CLOUD_SHADOW_DEFAULTS.softness,
      0,
      0.5,
      0.001
    ),
    darkness: cloudShadowControl(
      'uCloudShadowDarkness',
      CLOUD_SHADOW_DEFAULTS.darkness,
      0,
      1,
      0.01
    ),
    power: cloudShadowControl(
      'uCloudShadowPower',
      CLOUD_SHADOW_DEFAULTS.power,
      0.1,
      4,
      0.1
    ),
  });

  useFrame(({ elapsed }) => {
    // The shader ignores everything when disabled; skip the feed too.
    // Reduced motion: freeze the time - static dapples instead of drift
    if (REDUCED_MOTION_AT_LOAD) return;
    if (cloudShadowUniforms.uCloudShadowEnabled.value === 0) return;
    cloudShadowUniforms.uCloudShadowTime.value = elapsed;
  });

  return null;
};

export {
  CloudShadows,
  cloudShadowUniforms,
  cloudShadowFactor,
  patchCloudShadows,
};
