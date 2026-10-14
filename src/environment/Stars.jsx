import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import * as THREE from 'three/webgpu';
import {
  float,
  length,
  select,
  sin,
  time,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import {
  createGlowPointsMaterial,
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

const Stars = () => {
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
  const control = uniformControls(uniforms);
  const { count } = useControls('Stars', {
    count: {
      value: STARS_DEFAULTS.count,
      min: 0,
      max: 10000,
    },
    pointSize: control('uSize', STARS_DEFAULTS.pointSize, 0, 10),
    color1: control('uColor1', STARS_DEFAULTS.color1),
    color2: control('uColor2', STARS_DEFAULTS.color2),
    color3: control('uColor3', STARS_DEFAULTS.color3),
    brightness: control('uBrightness', STARS_DEFAULTS.brightness, 0, 10),
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

    const material = createGlowPointsMaterial();
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

    // Round soft dot: quadratic falloff from the center to the quad's
    // inscribed circle, 0 beyond it
    const alpha = length(pointCoord.sub(0.5))
      .mul(2)
      .oneMinus()
      .clamp(0, 1)
      .pow2();
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
  }, [count, uniforms]);

  useEffect(() => () => stars.material.dispose(), [stars]);

  return <primitive object={stars} rotation-y={Math.PI / 2} />;
};

export default Stars;
