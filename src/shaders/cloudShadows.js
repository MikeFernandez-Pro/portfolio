import * as THREE from 'three/webgpu';
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
  time,
  uniform,
  vec2,
  vec4,
} from 'three/tsl';

import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

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
// lantern, grass); <CloudShadows> drives them
const cloudShadowUniforms = {
  uCloudShadowEnabled: uniform(CLOUD_SHADOW_DEFAULTS.enabled ? 1 : 0),
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

// Reduced motion: frozen time, static dapples instead of drift
const cloudTime = REDUCED_MOTION_AT_LOAD ? float(0) : time;

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
      .add(u.uCloudShadowDirection.mul(cloudTime.mul(u.uCloudShadowSpeed)));

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

export {
  CLOUD_SHADOW_DEFAULTS,
  cloudShadowUniforms,
  cloudShadowFactor,
  patchCloudShadows,
};
