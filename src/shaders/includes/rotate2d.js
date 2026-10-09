import { cos, mat2, sin } from 'three/tsl';

// TSL port of rotate2d.glsl (same column-major layout as the GLSL mat2)
export const rotate2d = angle =>
  mat2(cos(angle), sin(angle).negate(), sin(angle), cos(angle));
