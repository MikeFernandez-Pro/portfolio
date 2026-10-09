import * as THREE from 'three/webgpu';
import {
  cos,
  distance,
  max,
  min,
  mix,
  mod,
  step,
  time,
  uniform,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { pointCoord } from '#utils/pointSprites.js';

const SPEED = 6;
const COLOR = '#f85f3d';
const INTENSITY = 0.78;

/** Uniform nodes driven by the TorchSparks props. */
const createSparksUniforms = ({
  size,
  color = COLOR,
  intensity = INTENSITY,
}) => ({
  uSize: uniform(size),
  uSpeed: uniform(SPEED),
  uColor: uniform(new THREE.Color(color)),
  uIntensity: uniform(intensity),
});

/**
 * Rising torch sparks on an instanced point sprite. `attributes` are the
 * per-spark particle attribute nodes: position (start jitter), aScale,
 * aElevation (rise length) and aOffset (the torch it belongs to).
 */
const createSparksMaterial = (u, { position, aScale, aElevation, aOffset }) => {
  // transparent puts the sparks in the transparent render list - required
  // for the sprite's renderOrder to place them after the smoke columns
  // (opaque objects draw before all transparent ones, whatever their
  // renderOrder), so the additive glow reads through the smoke instead of
  // being painted over by it
  const material = new THREE.PointsNodeMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  // Height inside the rise cycle (also drives the fade); the start jitter
  // narrows as the spark climbs and sways a little
  const posY = mod(time.mul(u.uSpeed), aElevation).mul(0.03);
  const x = position.x
    .div(max(0.9, posY.mul(10)))
    .add(cos(posY.mul(30)).mul(0.01));
  material.positionNode = vec3(x, posY, position.z).add(aOffset);

  // gl_PointSize = min(s, pow(s / (y * s), 2) * 10) * uResolution.y / -viewZ
  // with s = size * scale: pow(1 / y, 2) * 10 is written 10 / y² with a
  // floor, posY reaches exactly 0 at the bottom of each cycle
  const sparkSize = u.uSize.mul(aScale);
  material.sizeNode = min(
    sparkSize,
    max(posY.mul(posY), 1e-8).reciprocal().mul(10)
  ).mul(2);

  // Circle, fading from the torch color with height. Color and alpha are both
  // scaled by the fade (alpha can exceed 1: the HDR target doesn't clamp it)
  const circle = step(0.5, distance(pointCoord, vec2(0.5))).oneMinus();
  const gradientColor = u.uColor.mul(u.uIntensity).div(max(0.1, posY).mul(255));
  const color = mix(vec3(0), gradientColor, circle);
  const fade = min(10, max(0.1, max(posY, 0.0001).reciprocal()));
  material.colorNode = vec4(color, 1).mul(fade);

  return material;
};

export { createSparksUniforms, createSparksMaterial };
export { COLOR as SPARKS_COLOR, INTENSITY as SPARKS_INTENSITY };
