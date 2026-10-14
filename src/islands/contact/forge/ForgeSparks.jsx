import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import { uniformControls } from '#debug/uniformControls.js';
import * as THREE from 'three/webgpu';
import {
  cos,
  float,
  max,
  min,
  select,
  sin,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import {
  createGlowPointsMaterial,
  createParticleSprite,
  particleAttribute,
  pointDisc,
} from '#utils/pointSprites.js';

const COUNT = 100;
const FORGE_SPARKS_COLOR = '#ff8080';
const FORGE_SPARKS_INTENSITY = 2;
const FORGE_SPARKS_SIZE = 0.091;
const RADIUS = 0.44;
const HEIGHT = 0.66;

const sizes = new Float32Array(COUNT);
const angles = new Float32Array(COUNT);
const speed = new Float32Array(COUNT);

for (let i = 0; i < COUNT; i++) {
  sizes[i] = Math.random();
  angles[i] = Math.random() * Math.PI * 2;
  speed[i] = Math.random() * 0.5 + 0.5;
}

/**
 * Burst of sparks off the anvil at each hammer strike, driven by the
 * `progress` uniform (0 -> 1) that Forge.jsx tweens.
 */
const ForgeSparks = props => {
  const { progress } = props;

  const { sparks, uniforms } = useMemo(() => {
    const uniforms = {
      uSize: uniform(FORGE_SPARKS_SIZE),
      uProgress: progress,
      uColor: uniform(new THREE.Color(FORGE_SPARKS_COLOR)),
      uIntensity: uniform(FORGE_SPARKS_INTENSITY),
    };

    const aSize = particleAttribute(sizes, 1);
    const aAngle = particleAttribute(angles, 1);
    const aSpeed = particleAttribute(speed, 1);

    const material = createGlowPointsMaterial();

    // Explodes outward over the first 40% of the strike, then holds; a
    // finished strike (progress 1) collapses back to the anvil
    const elevation = select(
      uniforms.uProgress.equal(1),
      float(0),
      uniforms.uProgress
    );
    const explodingProgress = elevation.div(0.4);
    const sparkPosition = vec3(
      cos(aAngle).mul(RADIUS),
      aSpeed.mul(HEIGHT),
      sin(aAngle).mul(RADIUS)
    ).mul(explodingProgress);
    material.positionNode = sparkPosition;

    // Shrunk as the spark climbs: min(s, s / (y * 4.5)), with a floor
    // where y reaches 0
    material.sizeNode = uniforms.uSize
      .mul(aSize)
      .mul(min(1, max(sparkPosition.y.mul(4.5), 1e-6).reciprocal()))
      .mul(2);

    // Round spark (alpha 0 outside the disc), dimming over the strike
    const disc = pointDisc();
    material.colorNode = vec4(
      uniforms.uColor
        .mul(uniforms.uIntensity)
        .mul(uniforms.uProgress.oneMinus()),
      disc
    );

    const sparks = createParticleSprite(material, COUNT);
    sparks.position.set(-9.93, -1.11, 9.16);

    return { sparks, uniforms };
  }, [progress]);

  useEffect(() => () => sparks.material.dispose(), [sparks]);

  const control = uniformControls(uniforms);
  useControls('ForgeSparks', {
    color: control('uColor', FORGE_SPARKS_COLOR),
    intensity: control('uIntensity', FORGE_SPARKS_INTENSITY, 0, 20, 0.01),
    size: control('uSize', FORGE_SPARKS_SIZE, 0, 0.5, 0.001),
  });

  return <primitive object={sparks} />;
};

export { ForgeSparks };
