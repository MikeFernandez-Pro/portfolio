import * as THREE from 'three';
import {
  Fn,
  abs,
  clamp,
  float,
  length,
  max,
  normalGeometry,
  normalize,
  positionGeometry,
  pow,
  smoothstep,
  texture,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { RESPAWN_DEFAULTS } from '#controller/respawnAnimation.js';

/**
 * Respawn dissolve uniforms, shared by the knight and its lantern (the
 * respawn timeline tweens these, so both dissolve in sync). TSL uniform
 * nodes: `.value` reads/writes like the old `{ value }` objects.
 */
const createDissolveUniforms = noiseTexture => {
  // Voronoi (R) and perlin (G) share one packed texture
  const noise = texture(noiseTexture);

  return {
    uVoronoiTexture: noise,
    uPerlinTexture: noise,
    uColor: uniform(new THREE.Color(RESPAWN_DEFAULTS.charColor)),
    uIntensity: uniform(RESPAWN_DEFAULTS.charIntensity),
    uRepeat: uniform(RESPAWN_DEFAULTS.charRepeat),
    uPerlinScale: uniform(RESPAWN_DEFAULTS.charPerlinScale),
    uPerlinStrength: uniform(RESPAWN_DEFAULTS.charPerlinStrength),
    uPerlinSpeed: uniform(RESPAWN_DEFAULTS.charPerlinSpeed),
    uTime: uniform(0),
    uThickness: uniform(RESPAWN_DEFAULTS.charThickness),
    // voronoi reveal: 0 = none, 1 = full lava pattern
    uProgress: uniform(0),
    // 0 = only lava, 1 = formed character
    uCharFormProgress: uniform(1),
    // discard fragments below this alpha (no depth write)
    uAlphaClip: uniform(RESPAWN_DEFAULTS.alphaClip),
  };
};

const triplanar = (tex, p01, n, repeat, uvOffset) => {
  // interpolated normals can cancel to ~zero length, and normalize() of a
  // zero vector is NaN — same math, with the length floored
  const w0 = pow(abs(n).div(max(length(n), 1e-5)), vec3(8)).toVar();
  const w = w0.div(max(w0.x.add(w0.y).add(w0.z), 1e-5)).toVar();

  const cx = tex.sample(p01.zy.mul(repeat).add(uvOffset));
  const cy = tex.sample(p01.xz.mul(repeat).add(uvOffset));
  const cz = tex.sample(p01.xy.mul(repeat).add(uvOffset));

  return cx.mul(w.x).add(cy.mul(w.y)).add(cz.mul(w.z));
};

/**
 * Lava color of the dissolve (rgb premultiplied by the pattern, alpha = the
 * pattern), from the bind-pose position normalized to the mesh bounds — the
 * pattern sticks to the body whatever the animation.
 */
const dissolveLava = (u, boundsMin, boundsMax) =>
  Fn(() => {
    const size = max(vec3(boundsMax).sub(boundsMin), vec3(1e-5));
    const clampedPos = varying(
      clamp(positionGeometry.sub(boundsMin).div(size), 0, 1),
      'vDissolvePos'
    );
    const normal = varying(normalize(normalGeometry), 'vDissolveNormal');

    const perlinScroll = vec2(
      u.uPerlinSpeed,
      u.uTime.negate().mul(u.uPerlinSpeed).mul(0.5)
    );

    // perlin = green channel of the packed voronoi/perlin texture
    const perlin = triplanar(
      u.uPerlinTexture,
      clampedPos,
      normal,
      u.uPerlinScale,
      perlinScroll
    ).g;
    const deform = vec2(perlin.sub(0.5)).mul(u.uPerlinStrength);

    const voronoi = triplanar(
      u.uVoronoiTexture,
      clampedPos,
      normal,
      u.uRepeat,
      deform
    ).r;

    const lower = float(1).sub(u.uProgress);
    // max: the despawn/respawn timelines set uThickness to 0; equal
    // smoothstep edges are NaN where the pattern lands exactly on them
    const pattern = smoothstep(
      lower,
      lower.add(max(u.uThickness, 1e-5)),
      voronoi
    ).toVar();

    return vec4(u.uColor.mul(u.uIntensity).mul(pattern), pattern);
  })();

export { createDissolveUniforms, dissolveLava };
