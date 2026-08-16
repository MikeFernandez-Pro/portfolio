import { useControls } from '#utils/useControls.jsx';

import {
  TORCH_LIGHTS_DEFAULTS,
  LANTERN_LIGHTS_DEFAULTS,
  INDICATOR_LIGHTS_DEFAULTS,
  FORGE_LAVA_LIGHT_DEFAULTS,
  SWORD_LIGHT_DEFAULTS,
  WELL_LIGHT_DEFAULTS,
  CAULDRON_LIGHT_DEFAULTS,
  PLATE_LIGHTS_DEFAULTS,
  torchLightsUniforms,
  lanternLightsUniforms,
  indicatorLightsUniforms,
  forgeLavaLightUniforms,
  swordLightUniforms,
  wellLightUniforms,
  cauldronLightUniforms,
  plateLightsUniforms,
  forgeLavaLightSettings,
} from './islandPointLights.js';

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

  // Per-plate on/off is driven by the activation ramps in PressurePlates
  // (uPlateLightFactors); these controls set the shared look
  useControls(
    'PlateLights',
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

  useControls(
    'ForgeLavaLight',
    {
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

  return null;
};

export { IslandPointLightsControls };
