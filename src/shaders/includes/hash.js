import { dot, fract, sin, vec2 } from 'three/tsl';

// Classic sin-dot hash: vec2 node -> float in [0, 1)
export const hash12 = seed =>
  fract(sin(dot(seed, vec2(12.9898, 78.233))).mul(43758.5453));
