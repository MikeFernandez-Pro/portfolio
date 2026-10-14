import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import * as THREE from 'three/webgpu';
import {
  distance,
  max,
  select,
  sin,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import { LANTERN_POSITIONS } from './lanternPositions.js';
import {
  anchorSpread,
  createGlowPointsMaterial,
  createParticleSprite,
  particleAttribute,
  pointCoord,
  pointGlow,
} from '#utils/pointSprites.js';

// Reduced motion: the fireflies drift at a third of their usual pace
const FIREFLIES_TIME_SCALE = REDUCED_MOTION_AT_LOAD ? 0.3 : 1;

const FIREFLIES_PER_LANTERN = 20;
const FIREFLIES_COLOR = '#d58e6b';
const FIREFLIES_INTENSITY = 8.34;
const FIREFLIES_SIZE = 0.03;
const FIREFLIES_VELOCITY = 0.17;
const TOTAL_FIREFLIES_COUNT = LANTERN_POSITIONS.length * FIREFLIES_PER_LANTERN;

const POSITIONS_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT * 3);
const SCALES_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT);

const lanternOf = anchorSpread(TOTAL_FIREFLIES_COUNT, LANTERN_POSITIONS.length);
for (let i = 0; i < TOTAL_FIREFLIES_COUNT; i++) {
  const lantern = LANTERN_POSITIONS[lanternOf(i)];
  POSITIONS_ARRAY[i * 3 + 0] = (Math.random() - 0.5) * 0.6 + lantern[0];
  POSITIONS_ARRAY[i * 3 + 1] = (Math.random() - 0.5) * 0.3 + lantern[1];
  POSITIONS_ARRAY[i * 3 + 2] = (Math.random() - 0.5) * 0.6 + lantern[2];
  SCALES_ARRAY[i] = Math.random() * 0.5 + 0.5;
}

const FireFlies = () => {
  const { fireflies, uniforms } = useMemo(() => {
    const uniforms = {
      uSize: uniform(FIREFLIES_SIZE),
      uColor: uniform(new THREE.Color(FIREFLIES_COLOR)),
      uIntensity: uniform(FIREFLIES_INTENSITY),
    };

    const material = createGlowPointsMaterial();

    const position = particleAttribute(POSITIONS_ARRAY, 3);
    const aScale = particleAttribute(SCALES_ARRAY, 1);

    // Drift: x then y wobble (y reads the already moved x). The sprite has
    // no transform, so local space is world space
    const t = time.mul(FIREFLIES_TIME_SCALE).add(aScale.mul(15));
    const x = position.x.add(sin(position.y.add(t)).mul(FIREFLIES_VELOCITY));
    const y = position.y.add(sin(x.add(t)).mul(FIREFLIES_VELOCITY)).add(0.1);
    material.positionNode = vec3(x, y, position.z);

    material.sizeNode = uniforms.uSize.mul(aScale).mul(2);

    // Glowing disc, alpha 0 outside the circle. Color and alpha are both
    // scaled
    const distanceToCenter = distance(pointCoord, vec2(0.5));
    const strength = pointGlow();
    const glow = vec4(uniforms.uColor, strength)
      .mul(uniforms.uIntensity)
      .mul(max(aScale, 0));
    material.colorNode = select(
      distanceToCenter.greaterThan(0.475),
      vec4(1, 1, 1, 0),
      glow
    );

    return {
      fireflies: createParticleSprite(material, TOTAL_FIREFLIES_COUNT),
      uniforms,
    };
  }, []);

  useEffect(() => () => fireflies.material.dispose(), [fireflies]);

  const control = uniformControls(uniforms);
  useControls('FireFlies', {
    color: control('uColor', FIREFLIES_COLOR),
    intensity: control('uIntensity', FIREFLIES_INTENSITY, 0, 20, 0.01),
    size: control('uSize', FIREFLIES_SIZE, 0, 0.2, 0.001),
  });

  return <primitive object={fireflies} />;
};

export default FireFlies;
