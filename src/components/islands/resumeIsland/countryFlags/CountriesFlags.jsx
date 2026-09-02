import { useControls } from '#utils/useControls.jsx';

import {
  CountryFlag,
  flagsGradeUniforms,
  flagsIndividualUniforms,
} from './CountryFlag';

const FLAGS_GRADE_DEFAULTS = {
  lightness: 1.5,
  saturation: 1,
};

// Per-flag grade defaults are a no-op: the shared Grade folder stays the
// production source of truth until a flag is tuned individually
const useFlagOwnControls = (title, uniforms) => {
  useControls(
    title,
    {
      lightness: {
        value: 1,
        min: 0,
        max: 3,
        step: 0.01,
        onChange: v => {
          uniforms.uFlagOwnLightness.value = v;
        },
      },
      tint: {
        value: '#ffd6d6',
        onChange: v => {
          uniforms.uFlagTint.value.set(v);
        },
      },
    },
    { collapsed: true, reset: true }
  );
};

const CountriesFlags = props => {
  const { island } = props;

  useControls(
    'Grade',
    {
      lightness: {
        value: FLAGS_GRADE_DEFAULTS.lightness,
        min: 0,
        max: 3,
        step: 0.01,
        onChange: v => {
          flagsGradeUniforms.uFlagLightness.value = v;
        },
      },
      saturation: {
        value: FLAGS_GRADE_DEFAULTS.saturation,
        min: 0,
        max: 2,
        step: 0.01,
        onChange: v => {
          flagsGradeUniforms.uFlagSaturation.value = v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useFlagOwnControls('British', flagsIndividualUniforms.british);
  useFlagOwnControls('French', flagsIndividualUniforms.french);
  useFlagOwnControls('Spain', flagsIndividualUniforms.spain);

  return (
    <>
      <CountryFlag
        node={island.nodes.island_17}
        baseMaterial={island.materials.britishFlag}
        country="british"
      />
      <CountryFlag
        node={island.nodes.island_18}
        baseMaterial={island.materials.frenchFlag}
        country="french"
      />
      <CountryFlag
        node={island.nodes.island_19}
        baseMaterial={island.materials.spainFlag}
        country="spain"
      />
    </>
  );
};

export { CountriesFlags };
