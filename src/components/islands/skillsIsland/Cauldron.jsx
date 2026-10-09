import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three/webgpu';
import {
  cos,
  dot,
  float,
  floor,
  fract,
  length,
  mix,
  pow,
  sin,
  smoothstep,
  sqrt,
  step,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import {
  createCauldronPortalMaterial,
  createCauldronPortalUniforms,
} from '#shaders/cauldronPortal/cauldronPortal.js';
import {
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

// Pot self-rotation is idle motion; the liquid/bubbles stay animated
const SPEED = REDUCED_MOTION_AT_LOAD ? 0 : 0.5;
const POTION_PLANE_HEIGHT = 0;
const BUBBLES_SURFACE_OFFSET = 0.02;

// Boiling bubbles popping on the potion surface
const BUBBLES_DEFAULTS = {
  count: 5,
  color: '#35d567',
  intensity: 1,
  opacity: 1,
  coreOpacity: 0.51,
  rimThickness: 0.14,
  size: 0.171,
  speed: 0.465,
  growPower: 0.7,
  pop: 0.855,
  spread: 0.75,
};

// Buffers are allocated at the max once; the count control only changes
// how many sprite instances are drawn. Spawn spots are hashed per cycle in
// the shader, so only per-bubble timing/size randomness lives here.
const BUBBLES_COUNT = 80;
const bubblesPhases = new Float32Array(BUBBLES_COUNT);
const bubblesSpeeds = new Float32Array(BUBBLES_COUNT);
const bubblesSizes = new Float32Array(BUBBLES_COUNT);

for (let i = 0; i < BUBBLES_COUNT; i++) {
  bubblesPhases[i] = Math.random();
  bubblesSpeeds[i] = Math.random() * 0.8 + 0.6;
  bubblesSizes[i] = Math.random() * 0.6 + 0.4;
}

// Portal shader defaults
const PORTAL_DEFAULTS = {
  deepColor: '#429852',
  midColor: '#30e011',
  brightColor: '#35d567',
  opacity: 0.82,
  distortionScale: 1.4,
  distortionStrength: 0.2,
  distortionSpeed: 0.1,
  rotationSpeed: 0.6,
  backgroundStrength: 2,
  backgroundCenterGlow: 1.67,
  backgroundFalloff: 2.96,
  backgroundCloudContrast: 0,
  ribbonStrength: 0.61,
  ribbonCount: 3.5,
  ribbonWidth: 0.185,
  ribbonTwist: -3.99,
  ribbonSpeed: -0.51,
  ribbonBreakup: 0,
  filamentStrength: 0.59,
  filamentCount: 3,
  filamentWidth: 0.06,
  filamentTwist: -10,
  filamentSpeed: 1,
  filamentBreakup: 0.37,
  coreStrength: 0.69,
  coreRadius: 0.1,
  coreSoftness: 0.185,
  coreHalo: 0.33,
  corePulseAmount: 0.109,
  corePulseSpeed: 0.66,
};

const TWO_PI = 6.28318530718;

const hash = seed =>
  fract(sin(dot(seed, vec2(12.9898, 78.233))).mul(43758.5453));

// Boiling bubbles: each loops on its own phase and respawns at a new random
// spot of the surface every cycle, like water at a rolling boil: it stays in
// place, swells, then bursts
const createBubblesMaterial = u => {
  const material = new THREE.PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const aPhase = particleAttribute(bubblesPhases, 1);
  const aSpeed = particleAttribute(bubblesSpeeds, 1);
  const aSize = particleAttribute(bubblesSizes, 1);

  const progress = time.mul(u.uSpeed).mul(aSpeed).add(aPhase);
  const t = fract(progress);
  const cycle = floor(progress);

  const seed = vec2(aPhase.mul(137.13), aSpeed.mul(91.7)).add(cycle);
  const angle = hash(seed).mul(TWO_PI);
  const radius = sqrt(hash(seed.add(17.31))).mul(u.uSpread);
  material.positionNode = vec3(
    cos(angle).mul(radius).mul(u.uHalfSize.x),
    0,
    sin(angle).mul(radius).mul(u.uHalfSize.y)
  );

  // The size swells over the whole life (uGrowPower shapes the curve),
  // while the alpha pops sharply at the end instead of shrinking
  const swell = pow(t, u.uGrowPower);
  const life = smoothstep(0, 0.08, t).mul(
    smoothstep(u.uPopStart, 1, t).oneMinus()
  );
  // gl_PointSize = uSize * uResolution.y * aSize * swell / -viewZ
  material.sizeNode = u.uSize.mul(aSize).mul(swell).mul(2);

  // Bright rim around a tunable fill (0 = hollow ring, 1 = full disc),
  // alpha 0 outside the disc
  const distanceToCenter = length(pointCoord.sub(0.5));
  const rim = smoothstep(
    float(0.48).sub(u.uRimThickness),
    0.48,
    distanceToCenter
  );
  const alpha = mix(u.uCoreOpacity, 1, rim)
    .mul(life)
    .mul(u.uOpacity)
    .mul(step(distanceToCenter, 0.5));
  material.colorNode = vec4(u.uColor.mul(u.uIntensity), alpha);

  return material;
};

const Cauldron = props => {
  const { island } = props;

  const potionMeshRef = useRef(null);
  const bubblesPointsRef = useRef(null);
  const planeHeightRef = useRef(POTION_PLANE_HEIGHT);

  const perlinNoiseTexture = useVoronoiPerlinTexture();

  // The potion mesh has no UVs: the vertex shader maps the portal onto the
  // liquid disc from its local-space XZ bounds instead
  const portalBounds = useMemo(() => {
    const geometry = island.nodes.island_8.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    const { min, max } = geometry.boundingBox;

    return {
      center: new THREE.Vector2((min.x + max.x) / 2, (min.z + max.z) / 2),
      halfSize: new THREE.Vector2((max.x - min.x) / 2, (max.z - min.z) / 2),
      surfaceY: max.y,
    };
  }, [island]);

  const applyPlaneHeight = height => {
    planeHeightRef.current = height;

    if (potionMeshRef.current) {
      potionMeshRef.current.position.y = height;
    }

    if (bubblesPointsRef.current) {
      bubblesPointsRef.current.position.y =
        portalBounds.surfaceY + BUBBLES_SURFACE_OFFSET + height;
    }
  };

  useLayoutEffect(() => {
    applyPlaneHeight(planeHeightRef.current);
  }, [portalBounds]);

  const { bubbles, bubblesUniforms } = useMemo(() => {
    const bubblesUniforms = {
      uHalfSize: uniform(portalBounds.halfSize),
      uColor: uniform(new THREE.Color(BUBBLES_DEFAULTS.color)),
      uIntensity: uniform(BUBBLES_DEFAULTS.intensity),
      uOpacity: uniform(BUBBLES_DEFAULTS.opacity),
      uCoreOpacity: uniform(BUBBLES_DEFAULTS.coreOpacity),
      uRimThickness: uniform(BUBBLES_DEFAULTS.rimThickness),
      uSize: uniform(BUBBLES_DEFAULTS.size),
      uSpeed: uniform(BUBBLES_DEFAULTS.speed),
      uGrowPower: uniform(BUBBLES_DEFAULTS.growPower),
      uPopStart: uniform(BUBBLES_DEFAULTS.pop),
      uSpread: uniform(BUBBLES_DEFAULTS.spread),
    };
    const bubbles = createParticleSprite(
      createBubblesMaterial(bubblesUniforms),
      BUBBLES_DEFAULTS.count
    );
    // Above the liquid disc (the height follows the planeHeight control)
    bubbles.position.set(
      portalBounds.center.x,
      portalBounds.surfaceY + BUBBLES_SURFACE_OFFSET + POTION_PLANE_HEIGHT,
      portalBounds.center.y
    );
    return { bubbles, bubblesUniforms };
  }, [portalBounds]);

  useEffect(() => () => bubbles.material.dispose(), [bubbles]);
  bubblesPointsRef.current = bubbles;

  const bubblesNumberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      bubblesUniforms[uniform].value = v;
    },
  });

  useControls('CauldronBubbles', {
    count: {
      value: BUBBLES_DEFAULTS.count,
      min: 0,
      max: BUBBLES_COUNT,
      step: 1,
      onChange: v => {
        bubbles.count = v;
      },
    },
    color: {
      value: BUBBLES_DEFAULTS.color,
      onChange: v => {
        bubblesUniforms.uColor.value.set(v);
      },
    },
    intensity: bubblesNumberControl(
      'uIntensity',
      BUBBLES_DEFAULTS.intensity,
      0,
      20,
      0.1
    ),
    opacity: bubblesNumberControl(
      'uOpacity',
      BUBBLES_DEFAULTS.opacity,
      0,
      1,
      0.01
    ),
    // Inside fill of the bubble (0 = hollow ring, 1 = full disc)
    coreOpacity: bubblesNumberControl(
      'uCoreOpacity',
      BUBBLES_DEFAULTS.coreOpacity,
      0,
      1,
      0.01
    ),
    rimThickness: bubblesNumberControl(
      'uRimThickness',
      BUBBLES_DEFAULTS.rimThickness,
      0.01,
      0.48,
      0.005
    ),
    size: bubblesNumberControl('uSize', BUBBLES_DEFAULTS.size, 0, 0.3, 0.001),
    speed: bubblesNumberControl('uSpeed', BUBBLES_DEFAULTS.speed, 0, 2, 0.005),
    // Shape of the swelling over a bubble's life (< 1 grows fast then
    // slows down, > 1 the opposite)
    growPower: bubblesNumberControl(
      'uGrowPower',
      BUBBLES_DEFAULTS.growPower,
      0.2,
      3,
      0.01
    ),
    // Life fraction where the burst begins (closer to 1 = more sudden)
    pop: bubblesNumberControl(
      'uPopStart',
      BUBBLES_DEFAULTS.pop,
      0.5,
      0.99,
      0.005
    ),
    spread: bubblesNumberControl(
      'uSpread',
      BUBBLES_DEFAULTS.spread,
      0,
      1,
      0.01
    ),
  });

  const { portalMaterial, portalUniforms } = useMemo(() => {
    const portalUniforms = createCauldronPortalUniforms(
      PORTAL_DEFAULTS,
      portalBounds
    );
    const portalMaterial = createCauldronPortalMaterial(
      portalUniforms,
      perlinNoiseTexture
    );
    return { portalMaterial, portalUniforms };
  }, [perlinNoiseTexture, portalBounds]);

  useEffect(() => () => portalMaterial.dispose(), [portalMaterial]);

  // Control factories: every control just writes its uniform
  const numberControl = (uniform, value, min, max, step) => ({
    value,
    min,
    max,
    step,
    onChange: v => {
      portalUniforms[uniform].value = v;
    },
  });

  const colorControl = (uniform, value) => ({
    value,
    onChange: v => {
      portalUniforms[uniform].value.set(v);
    },
  });

  const d = PORTAL_DEFAULTS;

  useControls('CauldronLiquid', {
    planeHeight: {
      value: POTION_PLANE_HEIGHT,
      min: -0.5,
      max: 0.5,
      step: 0.001,
      onChange: applyPlaneHeight,
    },
    deepColor: colorControl('uDeepColor', d.deepColor),
    midColor: colorControl('uMidColor', d.midColor),
    brightColor: colorControl('uBrightColor', d.brightColor),
    opacity: numberControl('uOpacity', d.opacity, 0, 1, 0.01),
    distortionScale: numberControl(
      'uDistortionScale',
      d.distortionScale,
      0,
      3,
      0.01
    ),
    distortionStrength: numberControl(
      'uDistortionStrength',
      d.distortionStrength,
      0,
      0.2,
      0.001
    ),
    distortionSpeed: numberControl(
      'uDistortionSpeed',
      d.distortionSpeed,
      0,
      0.5,
      0.001
    ),
    rotationSpeed: numberControl(
      'uRotationSpeed',
      d.rotationSpeed,
      -3,
      3,
      0.01
    ),
    backgroundStrength: numberControl(
      'uBackgroundStrength',
      d.backgroundStrength,
      0,
      4,
      0.01
    ),
    backgroundCenterGlow: numberControl(
      'uBackgroundCenterGlow',
      d.backgroundCenterGlow,
      0,
      4,
      0.01
    ),
    backgroundFalloff: numberControl(
      'uBackgroundFalloff',
      d.backgroundFalloff,
      0.1,
      8,
      0.01
    ),
    backgroundCloudContrast: numberControl(
      'uBackgroundCloudContrast',
      d.backgroundCloudContrast,
      0,
      1,
      0.01
    ),
    ribbonStrength: numberControl(
      'uRibbonStrength',
      d.ribbonStrength,
      0,
      2,
      0.01
    ),
    ribbonCount: numberControl('uRibbonCount', d.ribbonCount, 0, 20, 0.5),
    ribbonWidth: numberControl('uRibbonWidth', d.ribbonWidth, 0, 0.5, 0.005),
    ribbonTwist: numberControl('uRibbonTwist', d.ribbonTwist, -10, 10, 0.01),
    ribbonSpeed: numberControl('uRibbonSpeed', d.ribbonSpeed, -3, 3, 0.01),
    ribbonBreakup: numberControl('uRibbonBreakup', d.ribbonBreakup, 0, 1, 0.01),
    filamentStrength: numberControl(
      'uFilamentStrength',
      d.filamentStrength,
      0,
      2,
      0.01
    ),
    filamentCount: numberControl('uFilamentCount', d.filamentCount, 0, 30, 0.5),
    filamentWidth: numberControl(
      'uFilamentWidth',
      d.filamentWidth,
      0,
      0.3,
      0.005
    ),
    filamentTwist: numberControl(
      'uFilamentTwist',
      d.filamentTwist,
      -10,
      10,
      0.01
    ),
    filamentSpeed: numberControl(
      'uFilamentSpeed',
      d.filamentSpeed,
      -3,
      3,
      0.01
    ),
    filamentBreakup: numberControl(
      'uFilamentBreakup',
      d.filamentBreakup,
      0,
      1,
      0.01
    ),
    coreStrength: numberControl('uCoreStrength', d.coreStrength, 0, 3, 0.01),
    coreRadius: numberControl('uCoreRadius', d.coreRadius, 0, 0.5, 0.005),
    coreSoftness: numberControl('uCoreSoftness', d.coreSoftness, 0, 0.5, 0.005),
    coreHalo: numberControl('uCoreHalo', d.coreHalo, 0, 2, 0.01),
    corePulseAmount: numberControl(
      'uCorePulseAmount',
      d.corePulseAmount,
      0,
      0.5,
      0.001
    ),
    corePulseSpeed: numberControl(
      'uCorePulseSpeed',
      d.corePulseSpeed,
      0,
      3,
      0.01
    ),
  });

  useFrame((state, delta) => {
    island.nodes.pot.rotation.y += delta * SPEED;
  });

  return (
    <>
      <skinnedMesh
        ref={potionMeshRef}
        name="island_8"
        geometry={island.nodes.island_8.geometry}
        skeleton={island.nodes.island_8.skeleton}
        morphTargetDictionary={island.nodes.island_8.morphTargetDictionary}
        morphTargetInfluences={island.nodes.island_8.morphTargetInfluences}
        material={portalMaterial}
      />
      {/* Boiling bubbles above the liquid disc */}
      <primitive object={bubbles} />
    </>
  );
};

export { Cauldron };
