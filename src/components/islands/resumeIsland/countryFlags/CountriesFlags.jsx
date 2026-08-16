import { useControls } from '#utils/useControls.jsx';

import { CountryFlag, flagsGradeUniforms } from './CountryFlag';

const FLAGS_GRADE_DEFAULTS = {
  lightness: 1,
  saturation: 1,
};

const CountriesFlags = props => {
  const { island } = props;

  useControls(
    'Flags',
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

  return (
    <>
      <CountryFlag
        node={island.nodes.island_17}
        baseMaterial={island.materials.britishFlag}
      />
      <CountryFlag
        node={island.nodes.island_18}
        baseMaterial={island.materials.frenchFlag}
      />
      <CountryFlag
        node={island.nodes.island_19}
        baseMaterial={island.materials.spainFlag}
      />
    </>
  );
};

export { CountriesFlags };
