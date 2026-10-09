import { useEffect } from 'react';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import { usePerlinCloudsTexture } from '#utils/packedTextures.js';
import {
  CLOUD_SHADOW_DEFAULTS,
  cloudShadowUniforms,
} from '#shaders/cloudShadows.js';

/**
 * Drives the shared cloud shadow uniforms: noise texture and controls.
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

  return null;
};

export { CloudShadows };
