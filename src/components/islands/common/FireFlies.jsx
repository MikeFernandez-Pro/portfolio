import { useEffect, useMemo } from 'react';
import { useControls } from '#utils/useControls.jsx';
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
import {
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

// Reduced motion: the fireflies drift at a third of their usual pace
const FIREFLIES_TIME_SCALE = REDUCED_MOTION_AT_LOAD ? 0.3 : 1;

const FIREFLIES_POSITIONS = [
  [-0.7, 2.3, -3.8],
  [0.7, 2.3, -3.8],
  [2.9, 2.3, -17.8],
  [4.2, 2.3, -17.6],
  [4, 4.3, -24.1],
  [5.25, 4.3, -23.9],
  [-0.25, 4.3, -29.15],
  [-0.1, 4.3, -30.5],
  [-6.6, 6.4, -29.9],
  [-6.4, 6.4, -31.2],
  [-9.2, 6.35, -35.6],
  [-10.5, 6.35, -35.6],
  [-10.5, 8.45, -41.9],
  [-9.15, 8.45, -41.9],
];

const FIREFLIES_PER_LAMP = 20;
const FIREFLIES_COLOR = '#d58e6b';
const FIREFLIES_INTENSITY = 8.34;
const FIREFLIES_SIZE = 0.03;
const FIREFLIES_VELOCITY = 0.17;
const TOTAL_FIREFLIES_COUNT = FIREFLIES_POSITIONS.length * FIREFLIES_PER_LAMP;

const POSITIONS_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT * 3);
const SCALES_ARRAY = new Float32Array(TOTAL_FIREFLIES_COUNT);

let currrentLampCount = 1;
for (let i = 0; i < TOTAL_FIREFLIES_COUNT; i++) {
  if (
    i >
    (TOTAL_FIREFLIES_COUNT / FIREFLIES_POSITIONS.length) * currrentLampCount
  ) {
    currrentLampCount++;
  }

  POSITIONS_ARRAY[i * 3 + 0] =
    (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][0];
  POSITIONS_ARRAY[i * 3 + 1] =
    (Math.random() - 0.5) * 0.3 + FIREFLIES_POSITIONS[currrentLampCount - 1][1];
  POSITIONS_ARRAY[i * 3 + 2] =
    (Math.random() - 0.5) * 0.6 + FIREFLIES_POSITIONS[currrentLampCount - 1][2];
  SCALES_ARRAY[i] = Math.random() * 0.5 + 0.5;
}

const FireFlies = () => {
  const controls = useControls('FireFlies', {
    color: {
      value: FIREFLIES_COLOR,
    },
    intensity: {
      value: FIREFLIES_INTENSITY,
      min: 0,
      max: 20,
      step: 0.01,
    },
    size: {
      value: FIREFLIES_SIZE,
      min: 0,
      max: 0.2,
      step: 0.001,
    },
  });

  const { fireflies, uniforms } = useMemo(() => {
    const uniforms = {
      uSize: uniform(FIREFLIES_SIZE),
      uColor: uniform(new THREE.Color(FIREFLIES_COLOR)),
      uIntensity: uniform(FIREFLIES_INTENSITY),
    };

    const material = new THREE.PointsNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const position = particleAttribute(POSITIONS_ARRAY, 3);
    const aScale = particleAttribute(SCALES_ARRAY, 1);

    // Drift: x then y wobble (y reads the already moved x, as before). The
    // sprite has no transform, so local space is world space
    const t = time.mul(FIREFLIES_TIME_SCALE).add(aScale.mul(15));
    const x = position.x.add(sin(position.y.add(t)).mul(FIREFLIES_VELOCITY));
    const y = position.y.add(sin(x.add(t)).mul(FIREFLIES_VELOCITY)).add(0.1);
    material.positionNode = vec3(x, y, position.z);

    // gl_PointSize = uSize * aScale * uResolution.y / -viewZ
    material.sizeNode = uniforms.uSize.mul(aScale).mul(2);

    // Glowing disc, alpha 0 outside the circle. max() guards the center
    // (1/0); the clamp already saturates below 0.05. Color and alpha are both
    // scaled, as gl_FragColor was
    const distanceToCenter = distance(pointCoord, vec2(0.5));
    const strength = max(distanceToCenter, 0.001)
      .reciprocal()
      .mul(0.05)
      .sub(0.1)
      .clamp(0, 1);
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

  useEffect(() => {
    uniforms.uColor.value.set(controls.color);
    uniforms.uIntensity.value = controls.intensity;
    uniforms.uSize.value = controls.size;
  }, [uniforms, controls.color, controls.intensity, controls.size]);

  return <primitive object={fireflies} />;
};

export default FireFlies;
