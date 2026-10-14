import { useMemo } from 'react';

import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';

import TorchSparks from './TorchSparks';
import {
  createSparksUniforms,
  SPARKS_COLOR,
  SPARKS_INTENSITY,
  SPARKS_SIZE_SCALE,
} from './sparksMaterial';
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
  const uniforms = useMemo(createSparksUniforms, []);

  const control = uniformControls(uniforms);
  useControls('TorchesSparks', {
    color: control('uColor', SPARKS_COLOR),
    intensity: control('uIntensity', SPARKS_INTENSITY, 0, 10, 0.01),
    sizeScale: control('uSizeScale', SPARKS_SIZE_SCALE, 0, 3, 0.01),
  });

  return (
    <>
      {TORCH_SIZE_CLASSES.map((config, index) => (
        <TorchSparks
          key={index}
          particlesCount={PARTICLES_COUNT}
          config={config}
          uniforms={uniforms}
        />
      ))}
    </>
  );
};

export default TorchesSparks;
