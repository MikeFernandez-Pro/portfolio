import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three/webgpu';
import {
  clamp,
  distance,
  mix,
  step,
  time,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';

import { snoise } from '#shaders/includes/simplexNoise3d.js';

// Swirling liquid surface: simplex-warped noise with an outer glow ring
const createLiquidMaterial = (colorStart, colorEnd) => {
  const uColorStart = uniform(new THREE.Color(colorStart));
  const uColorEnd = uniform(new THREE.Color(colorEnd));

  const material = new THREE.MeshBasicNodeMaterial({ transparent: true });

  // Displace the UV, then sample the noise again through it
  const displacedUv = uv().add(snoise(vec3(uv().mul(2.5), time.mul(0.2))));
  const noise = snoise(vec3(displacedUv, time.mul(0.1)));

  // Outer glow, then a hard step
  const glowed = noise.add(distance(uv(), vec2(0.5)).mul(5).sub(1.6));
  const strength = clamp(glowed.add(step(-0.2, glowed).mul(0.8)), 0, 1);

  material.colorNode = mix(uColorStart, uColorEnd, strength);

  return material;
};

const LiquidsShaders = ({ well, cauldron }) => {
  const wellMaterial = useMemo(
    () => createLiquidMaterial('#3f8ac0', '#106fb3'),
    []
  );

  const cauldronMaterial = useMemo(
    () => createLiquidMaterial('#89b359', '#4b6647'),
    []
  );

  useLayoutEffect(() => {
    well.position.y += 0.1;
    well.material = wellMaterial;
    cauldron.material = cauldronMaterial;
  }, []);
};

export default LiquidsShaders;
