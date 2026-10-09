import { useEffect, useMemo } from 'react';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three/webgpu';
import {
  float,
  select,
  sin,
  texture,
  time,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import { useSpiralGrassHeightTexture } from '#utils/packedTextures.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import {
  createParticleSprite,
  particleAttribute,
  pointCoord,
} from '#utils/pointSprites.js';

const SKY_RADIUS = 120;

const STARS_DEFAULTS = {
  count: 6000,
  pointSize: 0.8,
  color1: '#ffd700',
  color2: '#3b5ba5',
  color3: '#a3c1da',
  brightness: 10,
};

const Sky = () => {
  // Star sprite packed in the blue channel of the spiral/grass/star texture,
  // sitting at UV origin (sampled at pointCoord * 0.125)
  const starTexture = useSpiralGrassHeightTexture();

  const uniforms = useMemo(
    () => ({
      uSize: uniform(STARS_DEFAULTS.pointSize),
      uColor1: uniform(new THREE.Color(STARS_DEFAULTS.color1)),
      uColor2: uniform(new THREE.Color(STARS_DEFAULTS.color2)),
      uColor3: uniform(new THREE.Color(STARS_DEFAULTS.color3)),
      uBrightness: uniform(STARS_DEFAULTS.brightness),
    }),
    []
  );

  // Controls
  const { count } = useControls('Stars', {
    count: {
      value: STARS_DEFAULTS.count,
      min: 0,
      max: 10000,
    },
    pointSize: {
      value: STARS_DEFAULTS.pointSize,
      min: 0,
      max: 10,
      onChange: value => {
        uniforms.uSize.value = value;
      },
    },
    color1: {
      value: STARS_DEFAULTS.color1,
      onChange: value => uniforms.uColor1.value.set(value),
    },
    color2: {
      value: STARS_DEFAULTS.color2,
      onChange: value => uniforms.uColor2.value.set(value),
    },
    color3: {
      value: STARS_DEFAULTS.color3,
      onChange: value => uniforms.uColor3.value.set(value),
    },
    brightness: {
      value: STARS_DEFAULTS.brightness,
      min: 0,
      max: 10,
      onChange: value => {
        uniforms.uBrightness.value = value;
      },
    },
  });

  const stars = useMemo(() => {
    const positionsArray = new Float32Array(count * 3);
    const sizesArray = new Float32Array(count);
    const colorsArray = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const spherical = new THREE.Spherical(
        SKY_RADIUS * (0.75 + Math.random() * 0.25),
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      const position = new THREE.Vector3();
      position.setFromSpherical(spherical);

      positionsArray[i3] = position.x;
      positionsArray[i3 + 1] = position.y;
      positionsArray[i3 + 2] = position.z;

      sizesArray[i] = Math.random();
      colorsArray[i] = Math.random();
    }

    const aSize = particleAttribute(sizesArray, 1);
    const aColor = particleAttribute(colorsArray, 1);

    const material = new THREE.PointsNodeMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    material.positionNode = particleAttribute(positionsArray, 3);

    // Twinkle; reduced motion: frozen time = static star sizes
    const starTime = REDUCED_MOTION_AT_LOAD ? float(0) : time;
    material.sizeNode = aSize
      .mul(uniforms.uSize)
      .mul(
        sin(starTime.mul(5).add(aSize.mul(10)))
          .mul(0.1)
          .add(0.9)
      )
      .mul(2);

    // 64px star tile at the UV origin of the 512px packed texture (blue)
    const alpha = texture(starTexture, pointCoord.mul(0.125)).b;
    const color = select(
      aColor.lessThan(0.33),
      vec3(uniforms.uColor1),
      select(
        aColor.lessThan(0.66),
        uniforms.uColor2.mul(1.5),
        uniforms.uColor3.mul(2)
      )
    );
    material.colorNode = vec4(color.mul(uniforms.uBrightness), alpha);

    return createParticleSprite(material, count);
  }, [count, starTexture, uniforms]);

  useEffect(() => () => stars.material.dispose(), [stars]);

  return <primitive object={stars} rotation-y={Math.PI / 2} />;
};

export default Sky;
