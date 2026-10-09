import { useEffect, useMemo } from 'react';
import { float } from 'three/tsl';

import {
  createSmokeMaterial,
  createSmokeUniforms,
  smokeColumnTimeOffset,
} from '#shaders/smoke/smoke.js';

const POSITION = [-1.55, 6.8, -55.89];

const BONFIRE_SMOKE = {
  color: '#313131',
  opacity: 0.5,
  fadeHeight: 1,
  baseFade: 0,
  timeOffsetStrength: 1,
  swayScale: 2.8,
  swayPower: 1.6,
};

const BonfireSmoke = () => {
  const material = useMemo(
    () =>
      createSmokeMaterial(
        createSmokeUniforms(BONFIRE_SMOKE),
        float(smokeColumnTimeOffset(POSITION[0], POSITION[2]))
      ),
    []
  );

  useEffect(() => () => material.dispose(), [material]);

  return (
    <mesh position={POSITION} rotation={[0, 0, -0.3]} material={material}>
      <planeGeometry args={[0.3, 10, 16, 128]} />
    </mesh>
  );
};

export default BonfireSmoke;
