import { useControls } from '#debug/useControls.jsx';

import TorchSparks from './TorchSparks';
import { SPARKS_COLOR, SPARKS_INTENSITY } from './sparksMaterial';

/*
 *   Config
 */
const PARTICLES_COUNT = 40; // Number of particles per torch

const SMALL_TORCHES_SPARKS = {
  size: 0.04,
  scale: [0.45, 0.9, 0.45],
  offsets: [
    [-12.85, 2.0, -36.78], // -5.8, 1.7, -16.6
    [-30.77, 6.6, -79.09], // -18.5, 5.9, -31
    [-40.71, 6.59, -79.41], // -18.3 5.9 -35.7
    [-41.16, 6.55, -68.95], // -13.8 5.9 -35.6
    [-24.17, 8.82, -104.15], // -10.9 8.0 -46.9
    [-33.97, 8.65, -117.45], // -15.3 7.8 -52.9
    [-10.42, 8.75, -117.77], // -4.7 7.9 -53.0
  ],
};

const MEDIUM_TORCHES_SPARKS = {
  size: 0.06,
  scale: [0.8, 1.3, 0.8],
  offsets: [
    [-7.86, 6.55, -72.52], // -6.3 8.5 -58.0
    [-16.43, 6.55, -72.5], // -13.2 8.5 -58.0
  ],
};

const LARGE_TORCHES_SPARKS = {
  size: 0.16,
  scale: [1.5, 3, 1.5],
  offsets: [
    [-0.94, 2.4, -37.16], // -1.5 7.1 -55.8
  ],
};

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
      <TorchSparks
        particlesCount={PARTICLES_COUNT}
        config={SMALL_TORCHES_SPARKS}
        color={controls.color}
        intensity={controls.intensity}
        sizeScale={controls.sizeScale}
      />
      <TorchSparks
        particlesCount={PARTICLES_COUNT}
        config={MEDIUM_TORCHES_SPARKS}
        color={controls.color}
        intensity={controls.intensity}
        sizeScale={controls.sizeScale}
      />
      <TorchSparks
        particlesCount={PARTICLES_COUNT}
        config={LARGE_TORCHES_SPARKS}
        color={controls.color}
        intensity={controls.intensity}
        sizeScale={controls.sizeScale}
      />
    </>
  );
};

export default TorchesSparks;
