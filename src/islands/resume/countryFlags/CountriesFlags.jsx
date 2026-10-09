import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';

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
  const control = uniformControls(uniforms);
  useControls(title, {
    lightness: control('uFlagOwnLightness', 1, 0, 3, 0.01),
    tint: control('uFlagTint', '#ffd6d6'),
  });
};

const CountriesFlags = props => {
  const { island } = props;

  const flagsGradeControl = uniformControls(flagsGradeUniforms);
  useControls('Grade', {
    lightness: flagsGradeControl(
      'uFlagLightness',
      FLAGS_GRADE_DEFAULTS.lightness,
      0,
      3,
      0.01
    ),
    saturation: flagsGradeControl(
      'uFlagSaturation',
      FLAGS_GRADE_DEFAULTS.saturation,
      0,
      2,
      0.01
    ),
  });

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
