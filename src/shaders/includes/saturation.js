import { dot, mix, vec3 } from 'three/tsl';

// Saturation grade with Rec.601 luma weights (TSL's `saturation()` uses
// Rec.709, a different look): 0 = gray, 1 = unchanged, > 1 extrapolates
export const adjustSaturation = (color, amount) =>
  mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, amount);
