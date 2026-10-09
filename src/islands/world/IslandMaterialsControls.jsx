import { useLayoutEffect } from 'react';
import { useControls } from '#debug/useControls.jsx';

/**
 * The emissive island.glb materials (by their Blender name) and their debug
 * folder. `color`: the base color; when omitted, the emissive color control
 * sets both. Defaults match the tuned debug panel values.
 */
const EMISSIVE_MATERIALS = [
  {
    folder: 'Signs',
    material: 'signs',
    color: '#c67757',
    emissiveColor: '#c67757',
    emissiveIntensity: 9.2,
  },
  {
    folder: 'ForgeSword',
    material: 'forgeSword',
    color: '#ff6347',
    emissiveColor: '#ff6347',
    emissiveIntensity: 7.06,
  },
  {
    folder: 'Torches',
    material: 'torchesAndFire',
    color: '#f85f3d',
    emissiveColor: '#ff623f',
    emissiveIntensity: 10.7,
  },
  {
    folder: 'Candles',
    material: 'candles',
    color: '#e57164',
    emissiveColor: '#e57164',
    emissiveIntensity: 20,
  },
  // The street lanterns and the house windows share this material
  {
    folder: 'Lanterns',
    material: 'lanternsAndHomes',
    emissiveColor: '#ff7e7e',
    emissiveIntensity: 6,
  },
  // Glow of the keyboard-controls hint painted near the spawn point
  { folder: 'Controls', material: 'controls', emissiveIntensity: 5.2 },
];

// The values are also seeded in a layout effect: the initial onChange calls
// run in a regular effect, which can land after the first frames (the
// precompile warm-up included)
const MaterialControls = ({ material, settings }) => {
  const { color, emissiveColor, emissiveIntensity } = settings;

  useLayoutEffect(() => {
    if (emissiveColor !== undefined) {
      material.color.set(color ?? emissiveColor);
      material.emissive.set(emissiveColor);
    }
    material.emissiveIntensity = emissiveIntensity;
  }, [material, color, emissiveColor, emissiveIntensity]);

  const schema = {};
  if (color !== undefined) {
    schema.color = {
      value: color,
      onChange: value => {
        material.color.set(value);
      },
    };
  }
  if (emissiveColor !== undefined) {
    schema.emissiveColor = {
      value: emissiveColor,
      onChange: value => {
        if (color === undefined) material.color.set(value);
        material.emissive.set(value);
      },
    };
  }
  schema.emissiveIntensity = {
    value: emissiveIntensity,
    min: 0,
    max: 20,
    step: 0.01,
    onChange: value => {
      material.emissiveIntensity = value;
    },
  };
  useControls(settings.folder, schema);

  return null;
};

const IslandMaterialsControls = ({ materials }) =>
  EMISSIVE_MATERIALS.map(settings => (
    <MaterialControls
      key={settings.folder}
      material={materials[settings.material]}
      settings={settings}
    />
  ));

export { IslandMaterialsControls };
