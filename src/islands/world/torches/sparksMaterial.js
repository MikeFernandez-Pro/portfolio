import * as THREE from 'three/webgpu';
import {
  cos,
  max,
  min,
  mix,
  mod,
  time,
  uniform,
  vec3,
  vec4,
} from 'three/tsl';

import { createGlowPointsMaterial, pointDisc } from '#utils/pointSprites.js';

const SPEED = 6;
const COLOR = '#f85f3d';
const INTENSITY = 0.78;
const SIZE_SCALE = 2.12;

/**
 * Uniform nodes shared by every torch size class, written by the
 * TorchesSparks controls.
 */
const createSparksUniforms = () => ({
  uColor: uniform(new THREE.Color(COLOR)),
  uIntensity: uniform(INTENSITY),
  uSizeScale: uniform(SIZE_SCALE),
});

/**
 * Rising torch sparks on an instanced point sprite, `size` being the size
 * class's spark size. `attributes` are the per-spark particle attribute
 * nodes: position (start jitter), aScale, aElevation (rise length) and
 * aOffset (the torch it belongs to).
 */
const createSparksMaterial = (
  u,
  size,
  { position, aScale, aElevation, aOffset }
) => {
  const material = createGlowPointsMaterial();

  // Height inside the rise cycle (also drives the fade); the start jitter
  // narrows as the spark climbs and sways a little
  const posY = mod(time.mul(SPEED), aElevation).mul(0.03);
  const x = position.x
    .div(max(0.9, posY.mul(10)))
    .add(cos(posY.mul(30)).mul(0.01));
  material.positionNode = vec3(x, posY, position.z).add(aOffset);

  // Pixel size min(s, 10 / y²) with s = size * scale: sparks shrink as they
  // rise. y² is floored, posY reaches exactly 0 at the bottom of each cycle
  const sparkSize = u.uSizeScale.mul(size).mul(aScale);
  material.sizeNode = min(
    sparkSize,
    max(posY.mul(posY), 1e-8).reciprocal().mul(10)
  ).mul(2);

  // Circle, fading from the torch color with height. Color and alpha are both
  // scaled by the fade (alpha can exceed 1: the HDR target doesn't clamp it)
  const circle = pointDisc();
  const gradientColor = u.uColor.mul(u.uIntensity).div(max(0.1, posY).mul(255));
  const color = mix(vec3(0), gradientColor, circle);
  const fade = min(10, max(0.1, max(posY, 0.0001).reciprocal()));
  material.colorNode = vec4(color, 1).mul(fade);

  return material;
};

export { createSparksUniforms, createSparksMaterial };
export {
  COLOR as SPARKS_COLOR,
  INTENSITY as SPARKS_INTENSITY,
  SIZE_SCALE as SPARKS_SIZE_SCALE,
};
