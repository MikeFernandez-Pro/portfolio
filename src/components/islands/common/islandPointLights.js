import * as THREE from 'three';

import pointLightChunk from '#shaders/includes/pointLight.glsl';

// Old-school point lights (Three.js Journey shading lesson) injected into
// lit three.js materials (island terrain, character): one for the projects
// portal, one per torch flame, lantern and interactive link indicator,
// plus the forge lava, the anvil sword and the magic portal glyphs.

const PORTAL_LIGHT_DEFAULTS = {
  color: '#a6ddfb',
  intensity: 4.15,
  decay: 0.21,
  decayPower: 3.05,
  specularPower: 1,
};

const TORCH_LIGHTS_DEFAULTS = {
  color: '#ff8447',
  intensity: 1.6,
  decay: 0.255,
  decayPower: 4.95,
  specularPower: 1,
};

const LANTERN_LIGHTS_DEFAULTS = {
  color: '#ff9898',
  intensity: 5.6,
  decay: 0.375,
  decayPower: 2.55,
  specularPower: 1,
};

const BELT_LANTERN_LIGHT_DEFAULTS = {
  // Same warm tone as the street lanterns
  color: '#1a9cbe',
  intensity: 4.9,
  decay: 1,
  decayPower: 4.25,
  specularPower: 1,
  // Offset from the lantern mesh origin (the top loop the lantern hangs
  // from), expressed in character space (x sideways, z fore/aft, rotates
  // with the facing); the y drop sits the glow on the lantern body
  offset: [-0.03, -0.11, -0.12],
};

const INDICATOR_LIGHTS_DEFAULTS = {
  color: '#ffb27d',
  intensity: 0.9,
  decay: 0.395,
  decayPower: 4,
  specularPower: 1,
};

const FORGE_LAVA_LIGHT_DEFAULTS = {
  color: '#f47053',
  intensity: 6.9,
  decay: 0.23,
  decayPower: 5.7,
  specularPower: 1,
  // Slightly above the lava plane (ForgeLavaPlane sits at y 1.39)
  position: [-7.59, 1.8, -14.13],
};

const SWORD_LIGHT_DEFAULTS = {
  color: '#ff6347',
  intensity: 3.5,
  decay: 0.32,
  decayPower: 5.95,
  specularPower: 1,
  // The glowing sword on the anvil (hammer position in Forge.jsx)
  position: [-5.8, 2.0, -10.8],
};

const MAGIC_PORTAL_LIGHT_DEFAULTS = {
  color: '#ff6c43',
  intensity: 10,
  decay: 0.26,
  decayPower: 1.6,
  specularPower: 1,
  // Height of the light relative to the major glyph node
  height: 0.83,
};

const CAULDRON_LIGHT_DEFAULTS = {
  // The potion's bright color
  color: '#35d567',
  intensity: 8.5,
  decay: 0.4,
  decayPower: 5.75,
  specularPower: 1,
  // World position of the GLB `pot` node through the island group
  // transform; the height control lifts the light above it
  position: [8.64, 2.75, -29.73],
  height: 0.8,
};

const CANDLE_LIGHTS_DEFAULTS = {
  color: '#f28d4a',
  intensity: 1.35,
  // Tight radius: candles only glow on their immediate surroundings
  decay: 0.545,
  decayPower: 4.6,
  specularPower: 1,
  // Lift above the flame tip (world units)
  height: 0.12,
};

const PLATE_LIGHTS_DEFAULTS = {
  // The pressure plates' emissive color
  color: '#68cff2',
  intensity: 4.65,
  decay: 0.35,
  decayPower: 4.05,
  specularPower: 1,
  // Height of the lights above the plates
  height: 1.02,
};

const WINDOW_LIGHT_DEFAULTS = {
  // The window ray color
  color: '#fba567',
  intensity: 4.7,
  decay: 1,
  decayPower: 1.4,
  specularPower: 1,
  // Window-end cap of the ray beam: WindowRay local (-19.28, -0.94, 3.04)
  // through the island group transform (x0.45, +(-1.35, 2.25, -15))
  position: [-10.03, 1.43, -13.77],
};

const WELL_LIGHT_DEFAULTS = {
  // The well's inner water color
  color: '#4ad0ee',
  intensity: 2.45,
  decay: 0.385,
  decayPower: 1.6,
  specularPower: 1,
  // Just above the water disc: Well.jsx local (15.45, -1.82, 11.2) through
  // the island group transform (x0.45, +(-1.35, 2.25, -15))
  position: [5.6, 1.9, -9.96],
};

const SPAWN_LIGHT_DEFAULTS = {
  // Glow under the character spawn zone (Spiral SPAWN_POSITION x/z, world)
  color: '#44fca3',
  intensity: 8.5,
  decay: 0.435,
  decayPower: 3.9,
  specularPower: 1,
  position: [0, 0, 0],
  // Height lifts the light above the spawn base
  height: 1.2,
};

// World-space flame positions, same as TORCHES_POSITIONS in TorchesSparks.jsx
const TORCH_LIGHT_POSITIONS = [
  [-5.8, 1.7, -16.6],
  [-18.5, 5.9, -31],
  [-18.3, 5.9, -35.7],
  [-13.8, 5.9, -35.6],
  [-10.9, 8.0, -46.9],
  [-15.3, 7.8, -52.9],
  [-4.7, 7.9, -53.0],
  [-6.3, 8.5, -58.0],
  [-13.2, 8.5, -58.0],
  [-1.5, 7.1, -55.8],
];

// World-space lamp positions, same as FIREFLIES_POSITIONS in FireFlies.jsx
const LANTERN_LIGHT_POSITIONS = [
  [-0.7, 2.3, -3.8],
  [0.7, 2.3, -3.8],
  [2.9, 2.3, -17.8],
  [4.2, 2.3, -17.6],
  [4, 4.3, -24.1],
  [5.25, 4.3, -23.9],
  [-0.25, 4.3, -29.15],
  [-0.1, 4.3, -30.5],
  [-6.6, 6.4, -29.9],
  [-6.4, 6.4, -31.2],
  [-9.2, 6.35, -35.6],
  [-10.5, 6.35, -35.6],
  [-10.5, 8.45, -41.9],
  [-9.15, 8.45, -41.9],
];

// World-space interactive link indicator positions, same as the
// interactiveLinkPosition entries in interactiveElementsData.js
const INDICATOR_LIGHT_POSITIONS = [
  [-4.45, 2.5, -8.55], // mailBox
  [-3.4, 2.2, -9.09], // linkedIn
  [-2.26, 2.2, -9.65], // vercel
  [-16.14, 5.9, -37.3], // portal
  [-9.77, 7.9, -58.8], // statue
];

// World-space pressure plate positions (interactiveElementsData.js entries;
// the uPlateLightHeight uniform lifts the lights above them). Order must
// match PLATE_LIGHT_INDEX: each plate's activation animation drives its
// uPlateLightFactors component.
const PLATE_LIGHT_POSITIONS = [
  [-15.085, 4.4, -32.45], // portalPlate
  [-15.085, 4.4, -34.495], // seaPlate
  [-17.14, 4.4, -34.495], // halloweenPlate
];

const PLATE_LIGHT_INDEX = {
  portalPlate: 0,
  seaPlate: 1,
  halloweenPlate: 2,
};

// Settings mutated live by the debug controls, for the lights whose uniform
// intensity is driven every frame by an animation on top of the base value:
// - portal: scaled by the portal open factor (ProjectsPortals)
// - forge lava: scaled by the bellows gasp (ForgeLavaPlane)
// - magic portal: faded in by the glyph activation (MagicGlyphs)
const portalLightSettings = {
  intensity: PORTAL_LIGHT_DEFAULTS.intensity,
};
const forgeLavaLightSettings = {
  intensity: FORGE_LAVA_LIGHT_DEFAULTS.intensity,
};
const magicPortalLightSettings = {
  intensity: MAGIC_PORTAL_LIGHT_DEFAULTS.intensity,
  height: MAGIC_PORTAL_LIGHT_DEFAULTS.height,
};
// Spawn light: off at rest, faded in/out by the respawn timeline; the control
// sets the peak the fade rises to
const spawnLightSettings = {
  intensity: SPAWN_LIGHT_DEFAULTS.intensity,
};

const createLightUniforms = (prefix, defaults) => ({
  [`u${prefix}LightColor`]: { value: new THREE.Color(defaults.color) },
  [`u${prefix}LightIntensity`]: { value: defaults.intensity },
  [`u${prefix}LightDecay`]: { value: defaults.decay },
  [`u${prefix}LightDecayPower`]: { value: defaults.decayPower },
  [`u${prefix}LightSpecularPower`]: { value: defaults.specularPower },
});

const portalLightUniforms = {
  ...createLightUniforms('Portal', PORTAL_LIGHT_DEFAULTS),
  uPortalLightPosition: { value: new THREE.Vector3(-16.12, 6.95, -37.7) },
};
// Off until the first portal opening
portalLightUniforms.uPortalLightIntensity.value = 0;

const torchLightsUniforms = createLightUniforms(
  'Torch',
  TORCH_LIGHTS_DEFAULTS
);

const lanternLightsUniforms = createLightUniforms(
  'Lantern',
  LANTERN_LIGHTS_DEFAULTS
);

// Follows the character's belt lantern: the position uniform is written
// every frame by useLanternAttachment from the lantern mesh world position
const beltLanternLightUniforms = {
  ...createLightUniforms('BeltLantern', BELT_LANTERN_LIGHT_DEFAULTS),
  uBeltLanternLightPosition: { value: new THREE.Vector3() },
};

// Mutated by the debug control, applied by the per-frame position update
const beltLanternLightSettings = {
  offset: [...BELT_LANTERN_LIGHT_DEFAULTS.offset],
};

const indicatorLightsUniforms = createLightUniforms(
  'Indicator',
  INDICATOR_LIGHTS_DEFAULTS
);

const forgeLavaLightUniforms = {
  ...createLightUniforms('ForgeLava', FORGE_LAVA_LIGHT_DEFAULTS),
  uForgeLavaLightPosition: {
    value: new THREE.Vector3(...FORGE_LAVA_LIGHT_DEFAULTS.position),
  },
};

const swordLightUniforms = {
  ...createLightUniforms('Sword', SWORD_LIGHT_DEFAULTS),
  uSwordLightPosition: {
    value: new THREE.Vector3(...SWORD_LIGHT_DEFAULTS.position),
  },
};

const magicPortalLightUniforms = {
  ...createLightUniforms('MagicPortal', MAGIC_PORTAL_LIGHT_DEFAULTS),
  // Set from the glyph GLB node at runtime (see MagicGlyphs)
  uMagicPortalLightPosition: { value: new THREE.Vector3() },
};
// Off until the glyphs are activated
magicPortalLightUniforms.uMagicPortalLightIntensity.value = 0;

const windowLightUniforms = {
  ...createLightUniforms('Window', WINDOW_LIGHT_DEFAULTS),
  uWindowLightPosition: {
    value: new THREE.Vector3(...WINDOW_LIGHT_DEFAULTS.position),
  },
};

const wellLightUniforms = {
  ...createLightUniforms('Well', WELL_LIGHT_DEFAULTS),
  uWellLightPosition: {
    value: new THREE.Vector3(...WELL_LIGHT_DEFAULTS.position),
  },
};

const cauldronLightUniforms = {
  ...createLightUniforms('Cauldron', CAULDRON_LIGHT_DEFAULTS),
  uCauldronLightPosition: {
    value: new THREE.Vector3(
      CAULDRON_LIGHT_DEFAULTS.position[0],
      CAULDRON_LIGHT_DEFAULTS.position[1] + CAULDRON_LIGHT_DEFAULTS.height,
      CAULDRON_LIGHT_DEFAULTS.position[2]
    ),
  },
};

const spawnLightUniforms = {
  ...createLightUniforms('Spawn', SPAWN_LIGHT_DEFAULTS),
  uSpawnLightPosition: {
    value: new THREE.Vector3(
      SPAWN_LIGHT_DEFAULTS.position[0],
      SPAWN_LIGHT_DEFAULTS.position[1] + SPAWN_LIGHT_DEFAULTS.height,
      SPAWN_LIGHT_DEFAULTS.position[2]
    ),
  },
};
// Off until a respawn plays
spawnLightUniforms.uSpawnLightIntensity.value = 0;

// The candle flames live in the GLB, so unlike the other grouped lights the
// positions can't be baked as GLSL constants: Islands.jsx clusters the
// candles primitive at load and fills this fixed-size uniform array
const MAX_CANDLE_LIGHTS = 16;

const candleLightsUniforms = {
  ...createLightUniforms('Candle', CANDLE_LIGHTS_DEFAULTS),
  uCandleLightPositions: {
    value: Array.from(
      { length: MAX_CANDLE_LIGHTS },
      () => new THREE.Vector3()
    ),
  },
  uCandleLightCount: { value: 0 },
};

const setCandleLightPositions = positions => {
  if (positions.length > MAX_CANDLE_LIGHTS) {
    console.warn(
      `islandPointLights: ${positions.length} candle lights, ` +
        `capped at ${MAX_CANDLE_LIGHTS}`
    );
  }
  const count = Math.min(positions.length, MAX_CANDLE_LIGHTS);
  for (let i = 0; i < count; i++) {
    candleLightsUniforms.uCandleLightPositions.value[i].set(
      positions[i][0],
      positions[i][1] + CANDLE_LIGHTS_DEFAULTS.height,
      positions[i][2]
    );
  }
  candleLightsUniforms.uCandleLightCount.value = count;
};

const plateLightsUniforms = {
  ...createLightUniforms('Plate', PLATE_LIGHTS_DEFAULTS),
  // Per-plate activation factor (0 = off, 1 = active), animated by the
  // plate press/release ramps in PressurePlates
  uPlateLightFactors: { value: new THREE.Vector3(0, 0, 0) },
  uPlateLightHeight: { value: PLATE_LIGHTS_DEFAULTS.height },
};

// The grouped positions never move: bake them as GLSL constants instead of
// uniforms
const toGlslVec3Array = positions =>
  positions
    .map(
      ([x, y, z]) =>
        `vec3(${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`
    )
    .join(',\n    ');

const lightUniformsGlsl = prefix => `uniform vec3 u${prefix}LightColor;
uniform float u${prefix}LightIntensity;
uniform float u${prefix}LightDecay;
uniform float u${prefix}LightDecayPower;
uniform float u${prefix}LightSpecularPower;`;

const lightCallGlsl = (prefix, positionExpression) =>
  `islandLightAccum += islandPointLight(
    u${prefix}LightColor,
    u${prefix}LightIntensity,
    islandLightNormal,
    ${positionExpression},
    islandLightViewDirection,
    u${prefix}LightSpecularPower,
    vIslandLightsWorldPos,
    u${prefix}LightDecay,
    u${prefix}LightDecayPower
  );`;

/**
 * Injects the fake point lights into a lit three.js material (built-in or
 * CSM-wrapped, e.g. the island terrain and the character). Self-contained:
 * declares its own world position varying.
 */
const patchIslandPointLights = material => {
  const previousOnBeforeCompile = material.onBeforeCompile;

  // three's lit materials declare a local `PointLight pointLight;` in main()
  // when the scene has point lights, which would shadow the include's
  // function and break the call — rename it on injection
  const renamedPointLightChunk = pointLightChunk.replace(
    'vec3 pointLight(',
    'vec3 islandPointLight('
  );

  material.onBeforeCompile = (shader, renderer) => {
    previousOnBeforeCompile?.call(material, shader, renderer);

    Object.assign(
      shader.uniforms,
      portalLightUniforms,
      torchLightsUniforms,
      lanternLightsUniforms,
      beltLanternLightUniforms,
      indicatorLightsUniforms,
      forgeLavaLightUniforms,
      swordLightUniforms,
      magicPortalLightUniforms,
      wellLightUniforms,
      windowLightUniforms,
      plateLightsUniforms,
      cauldronLightUniforms,
      spawnLightUniforms,
      candleLightsUniforms
    );

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vIslandLightsWorldPos;'
      )
      .replace(
        '#include <worldpos_vertex>',
        '#include <worldpos_vertex>\nvIslandLightsWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;'
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vIslandLightsWorldPos;
${lightUniformsGlsl('Portal')}
uniform vec3 uPortalLightPosition;
${lightUniformsGlsl('Torch')}
${lightUniformsGlsl('Lantern')}
${lightUniformsGlsl('BeltLantern')}
uniform vec3 uBeltLanternLightPosition;
${lightUniformsGlsl('Indicator')}
${lightUniformsGlsl('ForgeLava')}
uniform vec3 uForgeLavaLightPosition;
${lightUniformsGlsl('Sword')}
uniform vec3 uSwordLightPosition;
${lightUniformsGlsl('MagicPortal')}
uniform vec3 uMagicPortalLightPosition;
${lightUniformsGlsl('Well')}
uniform vec3 uWellLightPosition;
${lightUniformsGlsl('Window')}
uniform vec3 uWindowLightPosition;
${lightUniformsGlsl('Cauldron')}
uniform vec3 uCauldronLightPosition;
${lightUniformsGlsl('Spawn')}
uniform vec3 uSpawnLightPosition;
${lightUniformsGlsl('Plate')}
uniform vec3 uPlateLightFactors;
uniform float uPlateLightHeight;
${lightUniformsGlsl('Candle')}
#define MAX_CANDLE_LIGHTS ${MAX_CANDLE_LIGHTS}
uniform vec3 uCandleLightPositions[MAX_CANDLE_LIGHTS];
uniform int uCandleLightCount;
#define PLATE_LIGHT_COUNT ${PLATE_LIGHT_POSITIONS.length}
const vec3 PLATE_LIGHT_POSITIONS[PLATE_LIGHT_COUNT] = vec3[](
    ${toGlslVec3Array(PLATE_LIGHT_POSITIONS)}
);
#define TORCH_LIGHT_COUNT ${TORCH_LIGHT_POSITIONS.length}
const vec3 TORCH_LIGHT_POSITIONS[TORCH_LIGHT_COUNT] = vec3[](
    ${toGlslVec3Array(TORCH_LIGHT_POSITIONS)}
);
#define LANTERN_LIGHT_COUNT ${LANTERN_LIGHT_POSITIONS.length}
const vec3 LANTERN_LIGHT_POSITIONS[LANTERN_LIGHT_COUNT] = vec3[](
    ${toGlslVec3Array(LANTERN_LIGHT_POSITIONS)}
);
#define INDICATOR_LIGHT_COUNT ${INDICATOR_LIGHT_POSITIONS.length}
const vec3 INDICATOR_LIGHT_POSITIONS[INDICATOR_LIGHT_COUNT] = vec3[](
    ${toGlslVec3Array(INDICATOR_LIGHT_POSITIONS)}
);
${renamedPointLightChunk}`
      )
      .replace(
        '#include <lights_fragment_end>',
        `#include <lights_fragment_end>
// Island point lights: the lesson works in world space, so the view-space
// normal is brought back to world
vec3 islandLightNormal = inverseTransformDirection(normal, viewMatrix);
vec3 islandLightViewDirection = normalize(vIslandLightsWorldPos - cameraPosition);
vec3 islandLightAccum = vec3(0.0);
${lightCallGlsl('Portal', 'uPortalLightPosition')}
for (int i = 0; i < TORCH_LIGHT_COUNT; i++) {
  ${lightCallGlsl('Torch', 'TORCH_LIGHT_POSITIONS[i]')}
}
for (int i = 0; i < LANTERN_LIGHT_COUNT; i++) {
  ${lightCallGlsl('Lantern', 'LANTERN_LIGHT_POSITIONS[i]')}
}
${lightCallGlsl('BeltLantern', 'uBeltLanternLightPosition')}
for (int i = 0; i < INDICATOR_LIGHT_COUNT; i++) {
  ${lightCallGlsl('Indicator', 'INDICATOR_LIGHT_POSITIONS[i]')}
}
${lightCallGlsl('ForgeLava', 'uForgeLavaLightPosition')}
${lightCallGlsl('Sword', 'uSwordLightPosition')}
${lightCallGlsl('MagicPortal', 'uMagicPortalLightPosition')}
${lightCallGlsl('Well', 'uWellLightPosition')}
${lightCallGlsl('Window', 'uWindowLightPosition')}
${lightCallGlsl('Cauldron', 'uCauldronLightPosition')}
${lightCallGlsl('Spawn', 'uSpawnLightPosition')}
for (int i = 0; i < MAX_CANDLE_LIGHTS; i++) {
  if (i >= uCandleLightCount) break;
  ${lightCallGlsl('Candle', 'uCandleLightPositions[i]')}
}
for (int i = 0; i < PLATE_LIGHT_COUNT; i++) {
  islandLightAccum += islandPointLight(
    uPlateLightColor,
    uPlateLightIntensity * uPlateLightFactors[i],
    islandLightNormal,
    PLATE_LIGHT_POSITIONS[i] + vec3(0.0, uPlateLightHeight, 0.0),
    islandLightViewDirection,
    uPlateLightSpecularPower,
    vIslandLightsWorldPos,
    uPlateLightDecay,
    uPlateLightDecayPower
  );
}
reflectedLight.directDiffuse += diffuseColor.rgb * islandLightAccum;`
      );
  };
  material.needsUpdate = true;
};

export {
  PORTAL_LIGHT_DEFAULTS,
  TORCH_LIGHTS_DEFAULTS,
  LANTERN_LIGHTS_DEFAULTS,
  BELT_LANTERN_LIGHT_DEFAULTS,
  INDICATOR_LIGHTS_DEFAULTS,
  FORGE_LAVA_LIGHT_DEFAULTS,
  SWORD_LIGHT_DEFAULTS,
  MAGIC_PORTAL_LIGHT_DEFAULTS,
  WELL_LIGHT_DEFAULTS,
  WINDOW_LIGHT_DEFAULTS,
  CAULDRON_LIGHT_DEFAULTS,
  SPAWN_LIGHT_DEFAULTS,
  PLATE_LIGHTS_DEFAULTS,
  CANDLE_LIGHTS_DEFAULTS,
  PLATE_LIGHT_INDEX,
  portalLightSettings,
  forgeLavaLightSettings,
  magicPortalLightSettings,
  spawnLightSettings,
  portalLightUniforms,
  torchLightsUniforms,
  lanternLightsUniforms,
  beltLanternLightUniforms,
  beltLanternLightSettings,
  indicatorLightsUniforms,
  forgeLavaLightUniforms,
  swordLightUniforms,
  magicPortalLightUniforms,
  wellLightUniforms,
  windowLightUniforms,
  cauldronLightUniforms,
  spawnLightUniforms,
  plateLightsUniforms,
  candleLightsUniforms,
  setCandleLightPositions,
  patchIslandPointLights,
};
