import * as THREE from 'three/webgpu';
import {
  Discard,
  Fn,
  If,
  abs,
  clamp,
  float,
  length,
  materialColor,
  max,
  mix,
  normalGeometry,
  normalize,
  positionGeometry,
  pow,
  smoothstep,
  texture,
  time,
  uniform,
  varying,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

/**
 * Uniforms of the lava dissolve pattern (dissolveLava), tweened by the
 * caller's timelines. `defaults`: color, intensity, repeat, perlinScale,
 * perlinStrength, perlinSpeed, thickness.
 */
const createDissolveUniforms = (noiseTexture, defaults) => ({
  // Voronoi (R) and perlin (G) share one packed texture
  uNoise: texture(noiseTexture),
  uColor: uniform(new THREE.Color(defaults.color)),
  uIntensity: uniform(defaults.intensity),
  uRepeat: uniform(defaults.repeat),
  uPerlinScale: uniform(defaults.perlinScale),
  uPerlinStrength: uniform(defaults.perlinStrength),
  uPerlinSpeed: uniform(defaults.perlinSpeed),
  uThickness: uniform(defaults.thickness),
  // voronoi reveal: 0 = none, 1 = full lava pattern
  uProgress: uniform(0),
});

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
      time.negate().mul(u.uPerlinSpeed).mul(0.5)
    );

    // perlin = green channel of the packed voronoi/perlin texture
    const perlin = triplanar(
      u.uNoise,
      clampedPos,
      normal,
      u.uPerlinScale,
      perlinScroll
    ).g;
    const deform = vec2(perlin.sub(0.5)).mul(u.uPerlinStrength);

    const voronoi = triplanar(
      u.uNoise,
      clampedPos,
      normal,
      u.uRepeat,
      deform
    ).r;

    const lower = float(1).sub(u.uProgress);
    // max: the death/respawn timelines set uThickness to 0; equal
    // smoothstep edges are NaN where the pattern lands exactly on them
    const pattern = smoothstep(
      lower,
      lower.add(max(u.uThickness, 1e-5)),
      voronoi
    ).toVar();

    return vec4(u.uColor.mul(u.uIntensity).mul(pattern), pattern);
  })();

/**
 * The character's colorNode: the lava mixed over the material's own color
 * (map included) by `u.uCharFormProgress` (0 = only lava, 1 = formed),
 * discarding fragments below `u.uAlphaClip`.
 */
const characterDissolveColor = (u, boundsMin, boundsMax) => {
  const lava = dissolveLava(u, boundsMin, boundsMax);
  return Fn(() => {
    const color = mix(lava, materialColor, u.uCharFormProgress).toVar();
    If(color.a.lessThan(u.uAlphaClip), () => {
      Discard();
    });
    return vec4(color);
  })();
};

export { createDissolveUniforms, dissolveLava, characterDissolveColor };
