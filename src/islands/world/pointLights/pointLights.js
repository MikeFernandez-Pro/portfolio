import * as THREE from 'three/webgpu';
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

import { LANTERN_POSITIONS } from '#islands/world/lanterns/lanternPositions.js';

// Old-school point lights (Three.js Journey shading lesson) shaded onto lit
// node materials (island terrain, character, lantern): the projects portal,
// every torch flame, lantern and interactive link indicator, the forge lava,
// the anvil sword, the skills glyph, the well, the house window, the
// cauldron, the spawn point, the candles and the project plates.

// World-space flame positions: the pre-offset coordinates noted next to each
// sparks offset in TorchesSparks.jsx
const TORCH_POSITIONS = [
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

// World-space interactive link indicator positions, same as the
// interactiveLinkPosition entries in interactiveElementsData.js
const INDICATOR_POSITIONS = [
  [-4.45, 2.5, -8.55], // mailBox
  [-3.4, 2.2, -9.09], // linkedIn
  [-2.26, 2.2, -9.65], // vercel
  [-16.14, 5.9, -37.3], // portal
  [-9.77, 7.9, -58.8], // statue
];

// World-space project plate positions (interactiveElementsData.js entries;
// the plate light height lifts the lights above them). Order must match
// PLATE_LIGHT_INDEX: each plate's press animation drives its `factors`
// component.
const PLATE_POSITIONS = [
  [-15.085, 4.4, -32.45], // portalPlate
  [-15.085, 4.4, -34.495], // seaPlate
  [-17.14, 4.4, -34.495], // halloweenPlate
];

const PLATE_LIGHT_INDEX = {
  portalPlate: 0,
  seaPlate: 1,
  halloweenPlate: 2,
};

// The candle flames live in the GLB, so unlike the other grouped lights the
// positions can't be baked as constants: Islands.jsx clusters the candles
// primitive at load and fills this fixed-size uniform array
const MAX_CANDLE_LIGHTS = 16;

const vector = ([x, y, z]) => new THREE.Vector3(x, y, z);

// One light (or group of lights sharing a look): its uniform nodes, the
// defaults the debug controls start from, plus any extra fields
const createPointLight = (defaults, extra = {}) => ({
  defaults,
  color: uniform(new THREE.Color(defaults.color)),
  intensity: uniform(defaults.intensity),
  decay: uniform(defaults.decay),
  decayPower: uniform(defaults.decayPower),
  specularPower: uniform(defaults.specularPower),
  ...extra,
});

const portal = {
  color: '#a6ddfb',
  intensity: 4.15,
  decay: 0.21,
  decayPower: 3.05,
  specularPower: 1,
};

const forgeLava = {
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

const skillsGlyph = {
  color: '#ff6c43',
  intensity: 10,
  decay: 0.26,
  decayPower: 1.6,
  specularPower: 1,
  // Height of the light relative to the major glyph node
  height: 0.83,
};

const cauldron = {
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

const spawn = {
  // Glow under the spawn point (SPAWN_POINT x/z, world)
  color: '#44fca3',
  intensity: 8.5,
  decay: 0.435,
  decayPower: 3.9,
  specularPower: 1,
  position: [0, 0, 0],
  // Height lifts the light above the spawn base
  height: 1.2,
};

const characterLantern = {
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

const candle = {
  color: '#f28d4a',
  intensity: 1.35,
  // Tight radius: candles only glow on their immediate surroundings
  decay: 0.545,
  decayPower: 4.6,
  specularPower: 1,
  // Lift above the flame tip (world units)
  height: 0.12,
};

const plate = {
  // The project plates' emissive color
  color: '#68cff2',
  intensity: 4.65,
  decay: 0.35,
  decayPower: 4.05,
  specularPower: 1,
  // Height of the lights above the plates
  height: 1.02,
};

const houseLantern = {
  // Standalone lantern by the house on the Contact island, not one of the
  // street lanterns; warmer orange than them
  color: '#ff9d00',
  intensity: 3.75,
  decay: 0.525,
  decayPower: 1.95,
  specularPower: 64,
  position: [-4.02, 1.82, -15.92],
};

const sword = {
  color: '#ff6347',
  intensity: 3.5,
  decay: 0.32,
  decayPower: 5.95,
  specularPower: 1,
  // The glowing sword on the anvil (hammer position in Forge.jsx)
  position: [-5.8, 2.0, -10.8],
};

const windowDefaults = {
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

const well = {
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

// `settings`: values the debug controls set for lights whose intensity (or
// position) an animation drives on top of them every frame
const pointLights = {
  // Scaled by the portal open factor (ProjectsPortal); off until the first
  // opening
  portal: createPointLight(portal, {
    position: uniform(new THREE.Vector3(-16.12, 6.95, -37.7)),
    settings: { intensity: portal.intensity },
  }),
  torch: createPointLight({
    color: '#ff8447',
    intensity: 1.6,
    decay: 0.255,
    decayPower: 4.95,
    specularPower: 1,
  }),
  lantern: createPointLight({
    color: '#ff9898',
    intensity: 5.6,
    decay: 0.375,
    decayPower: 2.55,
    specularPower: 1,
  }),
  // Follows the character lantern: useLanternAttachment writes the position
  // every frame from the lantern mesh, plus the offset setting
  characterLantern: createPointLight(characterLantern, {
    position: uniform(new THREE.Vector3()),
    settings: { offset: [...characterLantern.offset] },
  }),
  houseLantern: createPointLight(houseLantern, {
    position: uniform(vector(houseLantern.position)),
  }),
  indicator: createPointLight({
    color: '#ffb27d',
    intensity: 0.9,
    decay: 0.395,
    decayPower: 4,
    specularPower: 1,
  }),
  // Swept between the min/max settings by the bellows gasp (ForgeLavaPlane)
  forgeLava: createPointLight(forgeLava, {
    position: uniform(vector(forgeLava.position)),
    settings: {
      minIntensity: forgeLava.minIntensity,
      maxIntensity: forgeLava.maxIntensity,
    },
  }),
  sword: createPointLight(sword, {
    position: uniform(vector(sword.position)),
  }),
  // Faded in by the skills glyph awakening (SkillsGlyph), which also sets
  // the position from the glyph GLB node; off until then
  skillsGlyph: createPointLight(skillsGlyph, {
    position: uniform(new THREE.Vector3()),
    settings: {
      intensity: skillsGlyph.intensity,
      height: skillsGlyph.height,
    },
  }),
  well: createPointLight(well, {
    position: uniform(vector(well.position)),
  }),
  window: createPointLight(windowDefaults, {
    position: uniform(vector(windowDefaults.position)),
  }),
  cauldron: createPointLight(cauldron, {
    position: uniform(
      new THREE.Vector3(
        cauldron.position[0],
        cauldron.position[1] + cauldron.height,
        cauldron.position[2]
      )
    ),
  }),
  // Faded in and out by the respawn timeline up to the intensity setting;
  // off at rest
  spawn: createPointLight(spawn, {
    position: uniform(
      new THREE.Vector3(
        spawn.position[0],
        spawn.position[1] + spawn.height,
        spawn.position[2]
      )
    ),
    settings: { intensity: spawn.intensity },
  }),
  candle: createPointLight(candle, {
    // uniformArray re-uploads its .array every render
    positions: uniformArray(
      Array.from({ length: MAX_CANDLE_LIGHTS }, () => new THREE.Vector3()),
      'vec3'
    ),
    count: uniform(0, 'int'),
  }),
  plate: createPointLight(plate, {
    // Per-plate press factor (0 = off, 1 = pressed), animated by the plate
    // press/release ramps in ProjectPlates
    factors: uniform(new THREE.Vector3(0, 0, 0)),
    height: uniform(plate.height),
  }),
};

pointLights.portal.intensity.value = 0;
pointLights.skillsGlyph.intensity.value = 0;
pointLights.spawn.intensity.value = 0;

const setCandleLightPositions = positions => {
  const { candle } = pointLights;
  const count = Math.min(positions.length, MAX_CANDLE_LIGHTS);
  for (let i = 0; i < count; i++) {
    candle.positions.array[i].set(
      positions[i][0],
      positions[i][1] + candle.defaults.height,
      positions[i][2]
    );
  }
  candle.count.value = count;
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
 * Sum of every point light at the fragment (world space, before the albedo
 * multiply). The grouped positions never move: they are unrolled as
 * constants. Keep the order: the float sum depends on it.
 */
const sumPointLights = /*@__PURE__*/ Fn(() => {
  const normal = normalWorld;
  const position = positionWorld;
  const viewDirection = positionWorld.sub(cameraPosition).normalize();

  const accum = vec3(0).toVar();

  const addLight = (light, lightPosition, intensity = light.intensity) => {
    accum.addAssign(
      pointLight(
        light.color,
        intensity,
        normal,
        lightPosition,
        viewDirection,
        light.specularPower,
        position,
        light.decay,
        light.decayPower
      )
    );
  };
  const constant = ([x, y, z]) => vec3(x, y, z);
  const l = pointLights;

  addLight(l.portal, l.portal.position);
  TORCH_POSITIONS.forEach(p => addLight(l.torch, constant(p)));
  LANTERN_POSITIONS.forEach(p => addLight(l.lantern, constant(p)));
  addLight(l.characterLantern, l.characterLantern.position);
  addLight(l.houseLantern, l.houseLantern.position);
  INDICATOR_POSITIONS.forEach(p => addLight(l.indicator, constant(p)));
  addLight(l.forgeLava, l.forgeLava.position);
  addLight(l.sword, l.sword.position);
  addLight(l.skillsGlyph, l.skillsGlyph.position);
  addLight(l.well, l.well.position);
  addLight(l.window, l.window.position);
  addLight(l.cauldron, l.cauldron.position);
  addLight(l.spawn, l.spawn.position);

  Loop(MAX_CANDLE_LIGHTS, ({ i }) => {
    If(i.greaterThanEqual(l.candle.count), () => {
      Break();
    });
    addLight(l.candle, l.candle.positions.element(i));
  });

  const plateLift = vec3(0, l.plate.height, 0);
  ['x', 'y', 'z'].forEach((component, index) =>
    addLight(
      l.plate,
      constant(PLATE_POSITIONS[index]).add(plateLift),
      l.plate.intensity.mul(l.plate.factors[component])
    )
  );

  return accum;
});

/**
 * Adds the point lights to a lit node material (island terrain, character,
 * lantern). Lit like a direct diffuse light: the sum is scaled by the albedo
 * and added through the emissive slot, on top of the material's own
 * emissive. Idempotent. Classic (non-node) materials are skipped: they don't
 * render under WebGPU anyway.
 */
const patchPointLights = material => {
  if (!material.isNodeMaterial || material.userData.pointLights) return;
  material.userData.pointLights = true;

  const baseEmissive = material.emissiveNode ?? materialEmissive;
  material.emissiveNode = baseEmissive.add(
    diffuseColor.rgb.mul(sumPointLights())
  );
  material.needsUpdate = true;
};

export {
  pointLights,
  PLATE_LIGHT_INDEX,
  setCandleLightPositions,
  patchPointLights,
};
