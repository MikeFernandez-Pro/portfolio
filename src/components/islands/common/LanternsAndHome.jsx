import { useLayoutEffect } from 'react';
import { useControls } from 'leva';

const LANTERNS_EMISSIVE_COLOR = '#ff7e7e';
const LANTERNS_EMISSIVE_INTENSITY = 6.22;

const LanternsAndHome = props => {
  const { island } = props;

  // Lanterns and house windows share this single GLB material
  const lanternsMaterial = island.materials.lanternsAndHomes;

  useLayoutEffect(() => {
    lanternsMaterial.color.set(LANTERNS_EMISSIVE_COLOR);
    lanternsMaterial.emissive.set(LANTERNS_EMISSIVE_COLOR);
    lanternsMaterial.emissiveIntensity = LANTERNS_EMISSIVE_INTENSITY;
  }, [lanternsMaterial]);

  useControls(
    'Lanterns',
    {
      emissiveColor: {
        value: LANTERNS_EMISSIVE_COLOR,
        onChange: value => {
          lanternsMaterial.color.set(value);
          lanternsMaterial.emissive.set(value);
        },
      },
      emissiveIntensity: {
        value: LANTERNS_EMISSIVE_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => {
          lanternsMaterial.emissiveIntensity = value;
        },
      },
    },
    { collapsed: true }
  );

  return null;
};

export { LanternsAndHome };
