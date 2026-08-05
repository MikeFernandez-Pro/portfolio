import { useLayoutEffect } from 'react';
import { useControls } from 'leva';

/**
 * Leva controls for the emissive GLB island materials.
 * Defaults match the tuned debug panel values.
 */
const MATERIAL_DEFAULTS = {
  EmailSign: {
    color: '#c67757',
    emissiveColor: '#c67757',
    emissiveIntensity: 10.4,
  },
  ForgeSword: {
    color: '#ff6347',
    emissiveColor: '#ff6347',
    emissiveIntensity: 7.06,
  },
  Torches: {
    color: '#f85f3d',
    emissiveColor: '#ff623f',
    emissiveIntensity: 10.7,
  },
  Candles: {
    color: '#ffaf67',
    emissiveColor: '#ffaf67',
    emissiveIntensity: 20,
  },
  ForgeLava: {
    color: '#f47053',
    emissiveColor: '#f47053',
    emissiveIntensity: 9.81,
  },
};

const useMaterialControls = (folderName, material, defaults) => {
  useLayoutEffect(() => {
    material.color.set(defaults.color);
    material.emissive.set(defaults.emissiveColor);
    material.emissiveIntensity = defaults.emissiveIntensity;
  }, [material, defaults]);

  useControls(
    folderName,
    {
      color: {
        value: defaults.color,
        onChange: value => {
          material.color.set(value);
        },
      },
      emissiveColor: {
        value: defaults.emissiveColor,
        onChange: value => {
          material.emissive.set(value);
        },
      },
      emissiveIntensity: {
        value: defaults.emissiveIntensity,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => {
          material.emissiveIntensity = value;
        },
      },
    },
    { collapsed: true }
  );
};

const IslandMaterialsControls = props => {
  const { materials } = props;

  useMaterialControls(
    'EmailSign',
    materials.signs,
    MATERIAL_DEFAULTS.EmailSign
  );
  useMaterialControls(
    'ForgeSword',
    materials.forgeSword,
    MATERIAL_DEFAULTS.ForgeSword
  );
  useMaterialControls(
    'Torches',
    materials.torchesAndFire,
    MATERIAL_DEFAULTS.Torches
  );
  useMaterialControls(
    'Candles',
    materials.candles,
    MATERIAL_DEFAULTS.Candles
  );
  useMaterialControls(
    'ForgeLava',
    materials.lava,
    MATERIAL_DEFAULTS.ForgeLava
  );

  useLayoutEffect(() => {
    materials.controls.emissiveIntensity = 6.06;
  }, [materials.controls]);

  useControls(
    'Controls',
    {
      emissiveIntensity: {
        value: 6.06,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => {
          materials.controls.emissiveIntensity = value;
        },
      },
    },
    { collapsed: true }
  );

  return null;
};

export { IslandMaterialsControls };
