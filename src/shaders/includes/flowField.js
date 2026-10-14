import { smoothstep, time, vec2 } from 'three/tsl';

/**
 * Two-sample noise flow field over a disc-normalized `position` (rim at
 * radius 1), shared by the portal disc and the cauldron potion. `perlin` is
 * `uv => float`. Returns the drifting noise uv, both samples, the -1..1
 * distortion and how far from the (more stable) center the point is.
 * Call inside a `Fn` body: the uv and samples are `.toVar()`. Pass `radius`
 * when the caller already has `length(position)`.
 */
export const flowField = (
  perlin,
  position,
  { scale, speed, radius = position.length() }
) => {
  const noiseUv = position
    .mul(scale)
    .mul(0.42)
    .add(vec2(time.mul(speed), time.mul(speed).mul(-0.73)))
    .toVar();
  const noiseX = perlin(noiseUv).toVar();
  const noiseY = perlin(noiseUv.add(vec2(17.31, 41.73))).toVar();
  return {
    noiseUv,
    noiseX,
    noiseY,
    distortion: vec2(noiseX, noiseY).mul(2).sub(1),
    centerStability: smoothstep(0.02, 0.55, radius),
  };
};
