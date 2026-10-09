import * as THREE from 'three';
import {
  Break,
  Fn,
  If,
  Loop,
  cameraPosition,
  diffuseColor,
  dot,
  float,
  length,
  materialEmissive,
  max,
  normalWorld,
  normalize,
  positionWorld,
  pow,
  reflect,
  uniform,
  uniformArray,
  vec3,
} from 'three/tsl';

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

const HOUSE_LANTERN_LIGHT_DEFAULTS = {
  // Standalone lantern near the house on the first island, not part of
  // LANTERN_LIGHT_POSITIONS; warmer orange than the grouped street lanterns
  color: '#ff9d00',
  intensity: 3.75,
  decay: 0.525,
  decayPower: 1.95,
  specularPower: 64,
  position: [-4.02, 1.82, -15.92],
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
  // intensity only seeds the uniform; ForgeLavaPlane drives it every frame
  // between minIntensity (bellows open) and maxIntensity (fully closed)
  intensity: 20,
  minIntensity: 20,
  maxIntensity: 40,
  decay: 0.455,
  decayPower: 5.5,
  specularPower: 1,
  // Slightly above the lava plane (ForgeLavaPlane sits at y 1.39)
  position: [-7.4, 1.69, -13.91],
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

// World-space flame positions: the pre-offset coordinates noted next to each
// sparks offset in TorchesSparks.jsx
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
  minIntensity: FORGE_LAVA_LIGHT_DEFAULTS.minIntensity,
  maxIntensity: FORGE_LAVA_LIGHT_DEFAULTS.maxIntensity,
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

// TSL uniform nodes: `.value` reads/writes like the old `{ value }` objects,
// so the debug controls, gsap tweens and per-frame writers are unchanged
const createLightUniforms = (prefix, defaults) => ({
  [`u${prefix}LightColor`]: uniform(new THREE.Color(defaults.color)),
  [`u${prefix}LightIntensity`]: uniform(defaults.intensity),
  [`u${prefix}LightDecay`]: uniform(defaults.decay),
  [`u${prefix}LightDecayPower`]: uniform(defaults.decayPower),
  [`u${prefix}LightSpecularPower`]: uniform(defaults.specularPower),
});

const portalLightUniforms = {
  ...createLightUniforms('Portal', PORTAL_LIGHT_DEFAULTS),
  uPortalLightPosition: uniform(new THREE.Vector3(-16.12, 6.95, -37.7)),
};
// Off until the first portal opening
portalLightUniforms.uPortalLightIntensity.value = 0;

const torchLightsUniforms = createLightUniforms('Torch', TORCH_LIGHTS_DEFAULTS);

const lanternLightsUniforms = createLightUniforms(
  'Lantern',
  LANTERN_LIGHTS_DEFAULTS
);

// Follows the character's belt lantern: the position uniform is written
// every frame by useLanternAttachment from the lantern mesh world position
const beltLanternLightUniforms = {
  ...createLightUniforms('BeltLantern', BELT_LANTERN_LIGHT_DEFAULTS),
  uBeltLanternLightPosition: uniform(new THREE.Vector3()),
};

// Mutated by the debug control, applied by the per-frame position update
const beltLanternLightSettings = {
  offset: [...BELT_LANTERN_LIGHT_DEFAULTS.offset],
};

const houseLanternLightUniforms = {
  ...createLightUniforms('HouseLantern', HOUSE_LANTERN_LIGHT_DEFAULTS),
  uHouseLanternLightPosition: uniform(
    new THREE.Vector3(...HOUSE_LANTERN_LIGHT_DEFAULTS.position)
  ),
};

const indicatorLightsUniforms = createLightUniforms(
  'Indicator',
  INDICATOR_LIGHTS_DEFAULTS
);

const forgeLavaLightUniforms = {
  ...createLightUniforms('ForgeLava', FORGE_LAVA_LIGHT_DEFAULTS),
  uForgeLavaLightPosition: uniform(
    new THREE.Vector3(...FORGE_LAVA_LIGHT_DEFAULTS.position)
  ),
};

const swordLightUniforms = {
  ...createLightUniforms('Sword', SWORD_LIGHT_DEFAULTS),
  uSwordLightPosition: uniform(
    new THREE.Vector3(...SWORD_LIGHT_DEFAULTS.position)
  ),
};

const magicPortalLightUniforms = {
  ...createLightUniforms('MagicPortal', MAGIC_PORTAL_LIGHT_DEFAULTS),
  // Set from the glyph GLB node at runtime (see MagicGlyphs)
  uMagicPortalLightPosition: uniform(new THREE.Vector3()),
};
// Off until the glyphs are activated
magicPortalLightUniforms.uMagicPortalLightIntensity.value = 0;

const windowLightUniforms = {
  ...createLightUniforms('Window', WINDOW_LIGHT_DEFAULTS),
  uWindowLightPosition: uniform(
    new THREE.Vector3(...WINDOW_LIGHT_DEFAULTS.position)
  ),
};

const wellLightUniforms = {
  ...createLightUniforms('Well', WELL_LIGHT_DEFAULTS),
  uWellLightPosition: uniform(
    new THREE.Vector3(...WELL_LIGHT_DEFAULTS.position)
  ),
};

const cauldronLightUniforms = {
  ...createLightUniforms('Cauldron', CAULDRON_LIGHT_DEFAULTS),
  uCauldronLightPosition: uniform(
    new THREE.Vector3(
      CAULDRON_LIGHT_DEFAULTS.position[0],
      CAULDRON_LIGHT_DEFAULTS.position[1] + CAULDRON_LIGHT_DEFAULTS.height,
      CAULDRON_LIGHT_DEFAULTS.position[2]
    )
  ),
};

const spawnLightUniforms = {
  ...createLightUniforms('Spawn', SPAWN_LIGHT_DEFAULTS),
  uSpawnLightPosition: uniform(
    new THREE.Vector3(
      SPAWN_LIGHT_DEFAULTS.position[0],
      SPAWN_LIGHT_DEFAULTS.position[1] + SPAWN_LIGHT_DEFAULTS.height,
      SPAWN_LIGHT_DEFAULTS.position[2]
    )
  ),
};
// Off until a respawn plays
spawnLightUniforms.uSpawnLightIntensity.value = 0;

// The candle flames live in the GLB, so unlike the other grouped lights the
// positions can't be baked as constants: Islands.jsx clusters the candles
// primitive at load and fills this fixed-size uniform array
const MAX_CANDLE_LIGHTS = 16;

const candleLightsUniforms = {
  ...createLightUniforms('Candle', CANDLE_LIGHTS_DEFAULTS),
  // uniformArray re-uploads its .array every render
  uCandleLightPositions: uniformArray(
    Array.from({ length: MAX_CANDLE_LIGHTS }, () => new THREE.Vector3()),
    'vec3'
  ),
  uCandleLightCount: uniform(0, 'int'),
};

const setCandleLightPositions = positions => {
  const count = Math.min(positions.length, MAX_CANDLE_LIGHTS);
  for (let i = 0; i < count; i++) {
    candleLightsUniforms.uCandleLightPositions.array[i].set(
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
  uPlateLightFactors: uniform(new THREE.Vector3(0, 0, 0)),
  uPlateLightHeight: uniform(PLATE_LIGHTS_DEFAULTS.height),
};

// Old-school point light (Three.js Journey shading lesson): lambert shading
// + phong specular + shaped decay. Not physically based, but cheap.
// decayPower shapes the falloff inside the radius set by lightDecay:
// 1.0 = linear, > 1.0 = sharp hot core, < 1.0 = smooth spread-out pool.
// World space throughout.
const pointLight = /*@__PURE__*/ Fn(
  ([
    lightColor,
    lightIntensity,
    normal,
    lightPosition,
    viewDirection,
    specularPower,
    position,
    lightDecay,
    decayPower,
  ]) => {
    const result = vec3(0).toVar();

    const lightDelta = lightPosition.sub(position).toVar();
    const decay = float(1).sub(length(lightDelta).mul(lightDecay)).toVar();

    // Fragments outside the light radius skip the shading and specular work.
    // The branch is spatially coherent (neighboring fragments are in/out of
    // the same lights together), so it's cheap
    If(decay.greaterThan(0), () => {
      const lightDirection = normalize(lightDelta);
      const lightReflection = reflect(lightDirection.negate(), normal);

      const shading = max(0, dot(normal, lightDirection));
      const specular = pow(
        max(0, dot(lightReflection, viewDirection).negate()),
        specularPower
      );

      result.assign(
        lightColor
          .mul(lightIntensity)
          .mul(pow(decay, decayPower))
          .mul(shading.add(specular))
      );
    });

    return result;
  }
).setLayout({
  name: 'islandPointLight',
  type: 'vec3',
  inputs: [
    { name: 'lightColor', type: 'vec3' },
    { name: 'lightIntensity', type: 'float' },
    { name: 'normal', type: 'vec3' },
    { name: 'lightPosition', type: 'vec3' },
    { name: 'viewDirection', type: 'vec3' },
    { name: 'specularPower', type: 'float' },
    { name: 'position', type: 'vec3' },
    { name: 'lightDecay', type: 'float' },
    { name: 'decayPower', type: 'float' },
  ],
});

/**
 * Sum of every island point light at the fragment (world space, before the
 * albedo multiply). The grouped positions never move: they are unrolled as
 * constants.
 */
const islandPointLights = /*@__PURE__*/ Fn(() => {
  const normal = normalWorld;
  const position = positionWorld;
  const viewDirection = positionWorld.sub(cameraPosition).normalize();

  const accum = vec3(0).toVar();

  const addLight = (uniforms, prefix, lightPosition, intensity) => {
    accum.addAssign(
      pointLight(
        uniforms[`u${prefix}LightColor`],
        intensity ?? uniforms[`u${prefix}LightIntensity`],
        normal,
        lightPosition,
        viewDirection,
        uniforms[`u${prefix}LightSpecularPower`],
        position,
        uniforms[`u${prefix}LightDecay`],
        uniforms[`u${prefix}LightDecayPower`]
      )
    );
  };
  const constant = ([x, y, z]) => vec3(x, y, z);

  addLight(
    portalLightUniforms,
    'Portal',
    portalLightUniforms.uPortalLightPosition
  );
  TORCH_LIGHT_POSITIONS.forEach(p =>
    addLight(torchLightsUniforms, 'Torch', constant(p))
  );
  LANTERN_LIGHT_POSITIONS.forEach(p =>
    addLight(lanternLightsUniforms, 'Lantern', constant(p))
  );
  addLight(
    beltLanternLightUniforms,
    'BeltLantern',
    beltLanternLightUniforms.uBeltLanternLightPosition
  );
  addLight(
    houseLanternLightUniforms,
    'HouseLantern',
    houseLanternLightUniforms.uHouseLanternLightPosition
  );
  INDICATOR_LIGHT_POSITIONS.forEach(p =>
    addLight(indicatorLightsUniforms, 'Indicator', constant(p))
  );
  addLight(
    forgeLavaLightUniforms,
    'ForgeLava',
    forgeLavaLightUniforms.uForgeLavaLightPosition
  );
  addLight(swordLightUniforms, 'Sword', swordLightUniforms.uSwordLightPosition);
  addLight(
    magicPortalLightUniforms,
    'MagicPortal',
    magicPortalLightUniforms.uMagicPortalLightPosition
  );
  addLight(wellLightUniforms, 'Well', wellLightUniforms.uWellLightPosition);
  addLight(
    windowLightUniforms,
    'Window',
    windowLightUniforms.uWindowLightPosition
  );
  addLight(
    cauldronLightUniforms,
    'Cauldron',
    cauldronLightUniforms.uCauldronLightPosition
  );
  addLight(spawnLightUniforms, 'Spawn', spawnLightUniforms.uSpawnLightPosition);

  Loop(MAX_CANDLE_LIGHTS, ({ i }) => {
    If(i.greaterThanEqual(candleLightsUniforms.uCandleLightCount), () => {
      Break();
    });
    addLight(
      candleLightsUniforms,
      'Candle',
      candleLightsUniforms.uCandleLightPositions.element(i)
    );
  });

  const plateFactors = plateLightsUniforms.uPlateLightFactors;
  const plateLift = vec3(0, plateLightsUniforms.uPlateLightHeight, 0);
  ['x', 'y', 'z'].forEach((component, index) =>
    addLight(
      plateLightsUniforms,
      'Plate',
      constant(PLATE_LIGHT_POSITIONS[index]).add(plateLift),
      plateLightsUniforms.uPlateLightIntensity.mul(plateFactors[component])
    )
  );

  return accum;
});

/**
 * Adds the island point lights to a lit node material (island terrain,
 * character, lantern). Lit like a direct diffuse light: the sum is scaled by
 * the albedo and added through the emissive slot, on top of the material's
 * own emissive. Idempotent. Classic (non-node) materials are skipped: they
 * don't render under WebGPU anyway.
 */
const patchIslandPointLights = material => {
  if (!material.isNodeMaterial || material.userData.islandPointLights) return;
  material.userData.islandPointLights = true;

  const baseEmissive = material.emissiveNode ?? materialEmissive;
  material.emissiveNode = baseEmissive.add(
    diffuseColor.rgb.mul(islandPointLights())
  );
  material.needsUpdate = true;
};

export {
  PORTAL_LIGHT_DEFAULTS,
  TORCH_LIGHTS_DEFAULTS,
  LANTERN_LIGHTS_DEFAULTS,
  BELT_LANTERN_LIGHT_DEFAULTS,
  HOUSE_LANTERN_LIGHT_DEFAULTS,
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
  houseLanternLightUniforms,
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
  islandPointLights,
  patchIslandPointLights,
};
