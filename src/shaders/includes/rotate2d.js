import { cos, mat2, sin } from 'three/tsl';

// Column-major, like a GLSL mat2
export const rotate2d = angle =>
  mat2(cos(angle), sin(angle).negate(), sin(angle), cos(angle));
