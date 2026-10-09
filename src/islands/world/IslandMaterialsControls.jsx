import { useLayoutEffect } from 'react';
import { useControls } from '#debug/useControls.jsx';

/**
 * Debug controls for the emissive GLB island materials.
 * Defaults match the tuned debug panel values.
 */
const MATERIAL_DEFAULTS = {
  EmailSign: {
    color: '#c67757',
    emissiveColor: '#c67757',
    emissiveIntensity: 9.2,
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
    color: '#e57164',
    emissiveColor: '#e57164',
    emissiveIntensity: 20,
  },
};

const useMaterialControls = (folderName, material, defaults) => {
  useLayoutEffect(() => {
    material.color.set(defaults.color);
    material.emissive.set(defaults.emissiveColor);
    material.emissiveIntensity = defaults.emissiveIntensity;
  }, [material, defaults]);

  useControls(folderName, {
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
  });
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
  useMaterialControls('Candles', materials.candles, MATERIAL_DEFAULTS.Candles);
  useLayoutEffect(() => {
    materials.controls.emissiveIntensity = 5.2;
  }, [materials.controls]);

  useControls('Controls', {
    emissiveIntensity: {
      value: 5.2,
      min: 0,
      max: 20,
      step: 0.01,
      onChange: value => {
        materials.controls.emissiveIntensity = value;
      },
    },
  });

  return null;
};

export { IslandMaterialsControls };
