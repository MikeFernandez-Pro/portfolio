import { uniformControls } from '#debug/uniformControls.js';

/**
 * useControls entries for a point light's look (see pointLights.js).
 * `overrides` replaces entries or adds new ones, e.g. an intensity that sets
 * a setting an animation scales instead of the uniform.
 */
const pointLightControls = (light, overrides = {}) => {
  const d = light.defaults;
  const control = uniformControls(light);
  return {
    color: control('color', d.color),
    intensity: control('intensity', d.intensity, 0, 10, 0.05),
    decay: control('decay', d.decay, 0, 1, 0.005),
    decayPower: control('decayPower', d.decayPower, 0.1, 8, 0.05),
    specularPower: control('specularPower', d.specularPower, 1, 64, 1),
    ...overrides,
  };
};

// Position control (x/y/z fields) writing a light's position uniform
const positionControl = (light, value) => ({
  value,
  step: 0.01,
  onChange: v => light.position.value.set(...v),
});

export { pointLightControls, positionControl };
