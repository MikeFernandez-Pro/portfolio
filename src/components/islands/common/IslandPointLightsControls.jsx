import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

import { useControls } from '#utils/useControls.jsx';
import { DEBUG_ENABLED } from '#utils/debug.js';

import {
  TORCH_LIGHTS_DEFAULTS,
  LANTERN_LIGHTS_DEFAULTS,
  HOUSE_LANTERN_LIGHT_DEFAULTS,
  INDICATOR_LIGHTS_DEFAULTS,
  FORGE_LAVA_LIGHT_DEFAULTS,
  SWORD_LIGHT_DEFAULTS,
  WELL_LIGHT_DEFAULTS,
  WINDOW_LIGHT_DEFAULTS,
  CAULDRON_LIGHT_DEFAULTS,
  SPAWN_LIGHT_DEFAULTS,
  PLATE_LIGHTS_DEFAULTS,
  CANDLE_LIGHTS_DEFAULTS,
  torchLightsUniforms,
  lanternLightsUniforms,
  houseLanternLightUniforms,
  indicatorLightsUniforms,
  forgeLavaLightUniforms,
  swordLightUniforms,
  wellLightUniforms,
  windowLightUniforms,
  cauldronLightUniforms,
  spawnLightUniforms,
  plateLightsUniforms,
  candleLightsUniforms,
  forgeLavaLightSettings,
  spawnLightSettings,
} from './islandPointLights.js';

// Debug marker at a fake light's position: a small unlit sphere in the
// light color plus an axes cross, copying the position uniform every frame so
// the position control moves it live. Debug only (DEBUG_ENABLED gate at the
// call site), never mounted in production.
const LightPositionHelper = ({ positionUniform, colorUniform }) => {
  const groupRef = useRef();

  useFrame(() => {
    groupRef.current?.position.copy(positionUniform.value);
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshBasicMaterial color={colorUniform.value} toneMapped={false} />
      </mesh>
      <axesHelper args={[0.5]} />
    </group>
  );
};

// Debug folders for the point lights injected into the island material
// (the portal light folder lives in ProjectsPortals, the magic portal one
// in MagicGlyphs)
const IslandPointLightsControls = () => {
  const groupSchema = (uniforms, prefix, defaults) => ({
    color: {
      value: defaults.color,
      onChange: v => {
        uniforms[`u${prefix}LightColor`].value.set(v);
      },
    },
    intensity: {
      value: defaults.intensity,
      min: 0,
      max: 10,
      step: 0.05,
      onChange: v => {
        uniforms[`u${prefix}LightIntensity`].value = v;
      },
    },
    decay: {
      value: defaults.decay,
      min: 0,
      max: 1,
      step: 0.005,
      onChange: v => {
        uniforms[`u${prefix}LightDecay`].value = v;
      },
    },
    decayPower: {
      value: defaults.decayPower,
      min: 0.1,
      max: 8,
      step: 0.05,
      onChange: v => {
        uniforms[`u${prefix}LightDecayPower`].value = v;
      },
    },
    specularPower: {
      value: defaults.specularPower,
      min: 1,
      max: 64,
      step: 1,
      onChange: v => {
        uniforms[`u${prefix}LightSpecularPower`].value = v;
      },
    },
  });

  useControls(
    'TorchLights',
    groupSchema(torchLightsUniforms, 'Torch', TORCH_LIGHTS_DEFAULTS),
    { collapsed: true, reset: true }
  );

  useControls(
    'LanternLights',
    groupSchema(lanternLightsUniforms, 'Lantern', LANTERN_LIGHTS_DEFAULTS),
    { collapsed: true, reset: true }
  );

  // Standalone lantern near the house on the first island, not part of the
  // grouped LanternLights; showHelper marks the position while tuning it
  const { showHelper: showHouseLanternHelper } = useControls(
    'HouseLanternLight',
    {
      showHelper: false,
      ...groupSchema(
        houseLanternLightUniforms,
        'HouseLantern',
        HOUSE_LANTERN_LIGHT_DEFAULTS
      ),
      position: {
        value: HOUSE_LANTERN_LIGHT_DEFAULTS.position,
        step: 0.01,
        onChange: v => {
          houseLanternLightUniforms.uHouseLanternLightPosition.value.set(...v);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'CandlesLight',
    groupSchema(candleLightsUniforms, 'Candle', CANDLE_LIGHTS_DEFAULTS),
    { collapsed: true, reset: true }
  );

  useControls(
    'IndicatorLights',
    groupSchema(
      indicatorLightsUniforms,
      'Indicator',
      INDICATOR_LIGHTS_DEFAULTS
    ),
    { collapsed: true, reset: true }
  );

  useControls(
    'CauldronLight',
    {
      ...groupSchema(
        cauldronLightUniforms,
        'Cauldron',
        CAULDRON_LIGHT_DEFAULTS
      ),
      height: {
        value: CAULDRON_LIGHT_DEFAULTS.height,
        min: -1,
        max: 5,
        step: 0.01,
        onChange: v => {
          cauldronLightUniforms.uCauldronLightPosition.value.y =
            CAULDRON_LIGHT_DEFAULTS.position[1] + v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'SpawnLight',
    {
      ...groupSchema(spawnLightUniforms, 'Spawn', SPAWN_LIGHT_DEFAULTS),
      // The uniform is driven by the respawn timeline (0 at rest); the control
      // only sets the peak intensity the fade rises to
      intensity: {
        value: SPAWN_LIGHT_DEFAULTS.intensity,
        min: 0,
        max: 15,
        step: 0.05,
        onChange: v => {
          spawnLightSettings.intensity = v;
        },
      },
      height: {
        value: SPAWN_LIGHT_DEFAULTS.height,
        min: -2,
        max: 5,
        step: 0.01,
        onChange: v => {
          spawnLightUniforms.uSpawnLightPosition.value.y =
            SPAWN_LIGHT_DEFAULTS.position[1] + v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  // Per-plate on/off is driven by the activation ramps in PressurePlates
  // (uPlateLightFactors); these controls set the shared look
  useControls(
    'PlatesLight',
    {
      ...groupSchema(plateLightsUniforms, 'Plate', PLATE_LIGHTS_DEFAULTS),
      height: {
        value: PLATE_LIGHTS_DEFAULTS.height,
        min: -1,
        max: 5,
        step: 0.01,
        onChange: v => {
          plateLightsUniforms.uPlateLightHeight.value = v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  // showHelper has no onChange so it comes back as state and re-renders the
  // marker below; the position input (x/y/z fields) moves it live
  const { showHelper: showForgeLavaHelper } = useControls(
    'ForgeLavaLight',
    {
      showHelper: false,
      ...groupSchema(
        forgeLavaLightUniforms,
        'ForgeLava',
        FORGE_LAVA_LIGHT_DEFAULTS
      ),
      // The uniform is driven every frame by the bellows gasp in
      // ForgeLavaPlane; the control only sets the base intensity
      intensity: {
        value: FORGE_LAVA_LIGHT_DEFAULTS.intensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          forgeLavaLightSettings.intensity = v;
        },
      },
      position: {
        value: FORGE_LAVA_LIGHT_DEFAULTS.position,
        step: 0.01,
        onChange: v => {
          forgeLavaLightUniforms.uForgeLavaLightPosition.value.set(...v);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'SwordLight',
    {
      ...groupSchema(swordLightUniforms, 'Sword', SWORD_LIGHT_DEFAULTS),
      position: {
        value: SWORD_LIGHT_DEFAULTS.position,
        step: 0.01,
        onChange: v => {
          swordLightUniforms.uSwordLightPosition.value.set(...v);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'WellLight',
    {
      ...groupSchema(wellLightUniforms, 'Well', WELL_LIGHT_DEFAULTS),
      position: {
        value: WELL_LIGHT_DEFAULTS.position,
        step: 0.01,
        onChange: v => {
          wellLightUniforms.uWellLightPosition.value.set(...v);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useControls(
    'WindowLight',
    {
      ...groupSchema(windowLightUniforms, 'Window', WINDOW_LIGHT_DEFAULTS),
      position: {
        value: WINDOW_LIGHT_DEFAULTS.position,
        step: 0.01,
        onChange: v => {
          windowLightUniforms.uWindowLightPosition.value.set(...v);
        },
      },
    },
    { collapsed: true, reset: true }
  );

  return (
    <>
      {DEBUG_ENABLED && showForgeLavaHelper && (
        <LightPositionHelper
          positionUniform={forgeLavaLightUniforms.uForgeLavaLightPosition}
          colorUniform={forgeLavaLightUniforms.uForgeLavaLightColor}
        />
      )}
      {DEBUG_ENABLED && showHouseLanternHelper && (
        <LightPositionHelper
          positionUniform={houseLanternLightUniforms.uHouseLanternLightPosition}
          colorUniform={houseLanternLightUniforms.uHouseLanternLightColor}
        />
      )}
    </>
  );
};

export { IslandPointLightsControls };
