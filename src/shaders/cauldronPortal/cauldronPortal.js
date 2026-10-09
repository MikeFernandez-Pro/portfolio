import * as THREE from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  abs,
  atan,
  float,
  fract,
  length,
  min,
  mix,
  positionGeometry,
  pow,
  saturate,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  varying,
  vec2,
  vec4,
} from 'three/tsl';

import { rotate2d } from '#shaders/includes/rotate2d.js';

const TWO_PI = 6.28318530718;

/** Uniform nodes of the cauldron portal, from its defaults. */
const createCauldronPortalUniforms = (defaults, bounds) => {
  const d = defaults;
  return {
    uPortalCenter: uniform(bounds.center),
    uPortalHalfSize: uniform(bounds.halfSize),
    uDeepColor: uniform(new THREE.Color(d.deepColor)),
    uMidColor: uniform(new THREE.Color(d.midColor)),
    uBrightColor: uniform(new THREE.Color(d.brightColor)),
    uOpacity: uniform(d.opacity),
    uDistortionScale: uniform(d.distortionScale),
    uDistortionStrength: uniform(d.distortionStrength),
    uDistortionSpeed: uniform(d.distortionSpeed),
    uRotationSpeed: uniform(d.rotationSpeed),
    uBackgroundStrength: uniform(d.backgroundStrength),
    uBackgroundCenterGlow: uniform(d.backgroundCenterGlow),
    uBackgroundFalloff: uniform(d.backgroundFalloff),
    uBackgroundCloudContrast: uniform(d.backgroundCloudContrast),
    uRibbonStrength: uniform(d.ribbonStrength),
    uRibbonCount: uniform(d.ribbonCount),
    uRibbonWidth: uniform(d.ribbonWidth),
    uRibbonTwist: uniform(d.ribbonTwist),
    uRibbonSpeed: uniform(d.ribbonSpeed),
    uRibbonBreakup: uniform(d.ribbonBreakup),
    uFilamentStrength: uniform(d.filamentStrength),
    uFilamentCount: uniform(d.filamentCount),
    uFilamentWidth: uniform(d.filamentWidth),
    uFilamentTwist: uniform(d.filamentTwist),
    uFilamentSpeed: uniform(d.filamentSpeed),
    uFilamentBreakup: uniform(d.filamentBreakup),
    uCoreStrength: uniform(d.coreStrength),
    uCoreRadius: uniform(d.coreRadius),
    uCoreSoftness: uniform(d.coreSoftness),
    uCoreHalo: uniform(d.coreHalo),
    uCorePulseAmount: uniform(d.corePulseAmount),
    uCorePulseSpeed: uniform(d.corePulseSpeed),
  };
};

const stripeMask = (phase, width, softness) =>
  smoothstep(width, width.add(softness), abs(fract(phase).sub(0.5))).oneMinus();

/**
 * Painted vortex on the potion disc: a cloudy background, broad broken
 * spirals, thin filaments and a pulsing hot core, all driven by one
 * three-sample perlin flow field (green channel of the packed texture).
 * The potion mesh has no UVs: the portal coordinates come from its
 * local-space XZ footprint. Opaque like the CSM original (uOpacity only
 * feeds the discard threshold of the disc edge).
 */
const createCauldronPortalMaterial = (u, noiseTexture) => {
  const material = new THREE.MeshStandardNodeMaterial();

  // -1..1 across the liquid disc, 0 at its center
  const portalPosition = varying(
    positionGeometry.xz.sub(u.uPortalCenter).div(u.uPortalHalfSize),
    'vPortalPosition'
  );

  material.colorNode = Fn(() => {
    const baseRadius = length(portalPosition).toVar();
    const perlin = uv => texture(noiseTexture, uv).g;

    // One shared three-sample flow field drives every visual layer
    const noiseUv = portalPosition
      .mul(u.uDistortionScale)
      .mul(0.42)
      .add(
        vec2(
          time.mul(u.uDistortionSpeed),
          time.mul(u.uDistortionSpeed).mul(-0.73)
        )
      )
      .toVar();
    const noiseX = perlin(noiseUv).toVar();
    const noiseY = perlin(noiseUv.add(vec2(17.31, 41.73))).toVar();
    const detailNoise = perlin(
      noiseUv.mul(2.67).add(vec2(-9.17, 13.41))
    ).toVar();

    const distortion = vec2(noiseX, noiseY).mul(2).sub(1);
    const centerStability = smoothstep(0.02, 0.55, baseRadius);
    const flowPosition = rotate2d(time.mul(u.uRotationSpeed))
      .mul(portalPosition)
      .add(
        distortion.mul(u.uDistortionStrength).mul(mix(0.3, 1, centerStability))
      )
      .toVar();

    const radius = length(flowPosition).toVar();
    const angle = atan(flowPosition.y, flowPosition.x).toVar();
    const broadNoise = mix(noiseX, noiseY, 0.5).toVar();

    // Layer 1: a soft, cloudy volume that gives the brighter strokes depth
    const radialLight = pow(saturate(radius.oneMinus()), u.uBackgroundFalloff);
    const clouds = mix(
      1,
      smoothstep(0.18, 0.82, broadNoise),
      u.uBackgroundCloudContrast
    );
    const depth = mix(0.26, 1, radialLight).mul(clouds);
    const centerGlow = radialLight
      .mul(radialLight)
      .mul(u.uBackgroundCenterGlow);
    const background = depth.add(centerGlow).mul(u.uBackgroundStrength);

    // Layer 2: broad broken spirals, the painted vortex body
    const ribbonPhase = radius
      .mul(u.uRibbonCount)
      .sub(angle.mul(u.uRibbonTwist).div(TWO_PI))
      .sub(time.mul(u.uRibbonSpeed))
      .add(broadNoise.sub(0.5).mul(0.9));
    const ribbonBreakup = smoothstep(
      u.uRibbonBreakup.mul(0.72),
      min(1, u.uRibbonBreakup.mul(0.72).add(0.3)),
      mix(broadNoise, detailNoise, 0.42)
    );
    const ribbonEnvelope = smoothstep(0.04, 0.16, radius).mul(
      smoothstep(0.86, 1.08, radius).oneMinus()
    );
    const ribbons = stripeMask(ribbonPhase, u.uRibbonWidth, 0.065)
      .mul(mix(0.62, 1, detailNoise))
      .mul(ribbonBreakup)
      .mul(ribbonEnvelope)
      .mul(u.uRibbonStrength)
      .toVar();

    // Layer 3: sparse thin lines laid over the broad brush strokes
    const filamentPhase = radius
      .mul(u.uFilamentCount)
      .sub(angle.mul(u.uFilamentTwist).div(TWO_PI))
      .add(time.mul(u.uFilamentSpeed))
      .add(broadNoise.sub(0.5).mul(1.7));
    const sparseSections = smoothstep(
      u.uFilamentBreakup,
      min(1, u.uFilamentBreakup.add(0.18)),
      detailNoise
    );
    const filamentEnvelope = smoothstep(0.1, 0.25, radius).mul(
      smoothstep(0.78, 1.04, radius).oneMinus()
    );
    const filaments = stripeMask(filamentPhase, u.uFilamentWidth, 0.024)
      .mul(sparseSections)
      .mul(filamentEnvelope)
      .mul(u.uFilamentStrength);

    // Layer 4: a hot center disc plus a wider soft halo
    const pulse = float(1).add(
      sin(time.mul(u.uCorePulseSpeed).mul(TWO_PI)).mul(u.uCorePulseAmount)
    );
    const coreRadius = u.uCoreRadius.mul(pulse).toVar();
    const coreDisc = smoothstep(
      coreRadius,
      coreRadius.add(u.uCoreSoftness),
      radius
    ).oneMinus();
    const halo = smoothstep(
      coreRadius,
      coreRadius.add(u.uCoreSoftness.mul(3.2)),
      radius
    ).oneMinus();
    const core = coreDisc.add(halo.mul(u.uCoreHalo)).mul(u.uCoreStrength);

    const color = mix(
      u.uDeepColor.mul(0.42),
      u.uMidColor,
      saturate(background.mul(0.72))
    )
      .add(u.uMidColor.mul(ribbons).mul(0.72))
      .add(u.uBrightColor.mul(ribbons).mul(ribbons).mul(0.26))
      .add(u.uBrightColor.mul(filaments))
      .add(u.uBrightColor.mul(core));

    const alpha = smoothstep(0.96, 1.06, baseRadius)
      .oneMinus()
      .mul(u.uOpacity)
      .toVar();
    If(alpha.lessThan(0.003), () => {
      Discard();
    });

    return vec4(color, alpha);
  })();

  return material;
};

export { createCauldronPortalMaterial, createCauldronPortalUniforms };
