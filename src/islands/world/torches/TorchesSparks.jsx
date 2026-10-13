import { useControls } from '#debug/useControls.jsx';

import TorchSparks from './TorchSparks';
import { SPARKS_COLOR, SPARKS_INTENSITY } from './sparksMaterial';
import { TORCHES } from './torches.js';

const PARTICLES_COUNT = 40; // Number of particles per torch

// One sprite per torch size class. The sprite is scaled non-uniformly to
// stretch the spark paths, so its torch offsets are the world sparks
// origins divided by that scale
const TORCH_SIZE_CLASSES = [
  { name: 'small', size: 0.04, scale: [0.45, 0.9, 0.45] },
  { name: 'medium', size: 0.06, scale: [0.8, 1.3, 0.8] },
  { name: 'large', size: 0.16, scale: [1.5, 3, 1.5] },
].map(({ name, size, scale }) => ({
  size,
  scale,
  offsets: TORCHES.filter(torch => torch.size === name).map(torch =>
    torch.sparks.map((value, axis) => value / scale[axis])
  ),
}));

const TorchesSparks = () => {
  const controls = useControls('TorchesSparks', {
    color: {
      value: SPARKS_COLOR,
    },
    intensity: {
      value: SPARKS_INTENSITY,
      min: 0,
      max: 10,
      step: 0.01,
    },
    sizeScale: {
      value: 2.12,
      min: 0,
      max: 3,
      step: 0.01,
    },
  });

  return (
    <>
      {TORCH_SIZE_CLASSES.map((config, index) => (
        <TorchSparks
          key={index}
          particlesCount={PARTICLES_COUNT}
          config={config}
          color={controls.color}
          intensity={controls.intensity}
          sizeScale={controls.sizeScale}
        />
      ))}
    </>
  );
};

export default TorchesSparks;
