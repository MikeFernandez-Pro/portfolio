import * as THREE from 'three/webgpu';
import {
  abs,
  cameraPosition,
  clamp,
  Discard,
  dot,
  Fn,
  If,
  length,
  max,
  mix,
  modelWorldMatrix,
  normalize,
  positionWorld,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';

import { uniformControls } from '#debug/uniformControls.js';
import { flowField } from '#shaders/includes/flowField.js';
import { adjustSaturation } from '#shaders/includes/saturation.js';

// Current visuals, tweakable from the 'ProjectsPortal' debug folder
const PORTAL_DISC_DEFAULTS = {
  noiseScale: 1.14,
  noiseSpeed: 0.05,
  deformationStart: 0.3,
  deformationEnd: 0.41,
  deformationStrength: 0.18,
  // Fake window-interior parallax on the project image, driven by the
  // camera (which follows the character): depth of the virtual image plane
  // behind the disc. The offset is horizontal only — the images' extra
  // width is the slide margin, so no zoom inset is needed
  parallaxDepth: 0.4,
  // Emissive edge ring; intensity > 2 crosses the Bloom threshold
  rimColor: '#ffffff',
  rimIntensity: 3.7,
  rimWidth: 0.02,
  lighting: 1,
  saturation: 1.16,
  sizePulseSpeed: 2.39,
  sizePulseMin: 0.063,
  sizePulseMax: 0.1,
  // Noise flow field that pushes the project texture around (strength in
  // disc units, scaled by the opening)
  distortionScale: 0.78,
  distortionStrength: 0.16044,
  distortionSpeed: 0.033,
};

// The disc's uniforms. `uSize` is driven by the open animation, the texture
// rect by the selected project (see ProjectsPortal)
export const createPortalDiscUniforms = () => {
  const d = PORTAL_DISC_DEFAULTS;
  return {
    uSize: uniform(-0.2),
    // Atlas rect of the selected project's image; set before the portal
    // ever opens
    uTextureOffset: uniform(new THREE.Vector2(0, 0)),
    uTextureSize: uniform(new THREE.Vector2(1, 1)),
    uSizePulseSpeed: uniform(d.sizePulseSpeed),
    uSizePulseMin: uniform(d.sizePulseMin),
    uSizePulseMax: uniform(d.sizePulseMax),
    uNoiseScale: uniform(d.noiseScale),
    uNoiseSpeed: uniform(d.noiseSpeed),
    uDeformationStart: uniform(d.deformationStart),
    uDeformationEnd: uniform(d.deformationEnd),
    uDeformationStrength: uniform(d.deformationStrength),
    uParallaxDepth: uniform(d.parallaxDepth),
    uTextureAspect: uniform(1),
    uRimColor: uniform(new THREE.Color(d.rimColor)),
    uRimIntensity: uniform(d.rimIntensity),
    uRimWidth: uniform(d.rimWidth),
    uLighting: uniform(d.lighting),
    uSaturation: uniform(d.saturation),
    uDistortionScale: uniform(d.distortionScale),
    uDistortionStrength: uniform(d.distortionStrength),
    uDistortionSpeed: uniform(d.distortionSpeed),
  };
};

// Project disc: noise-deformed edge, fake window-interior parallax on the
// project image (from the shared sRGB screens atlas), a noise flow field
// pushing the image around, a lighting/saturation grade and an emissive rim
export const createPortalDiscMaterial = (
  u,
  screensAtlasTexture,
  perlinTexture
) => {
  const material = new THREE.MeshBasicNodeMaterial({ transparent: true });
  const perlin = coords => texture(perlinTexture, coords).g;

  material.colorNode = Fn(() => {
    const vUv = uv();
    const center = vec2(0.5);

    // Size pulse animation on top of the (animated) base size
    const size = u.uSize
      .add(
        mix(
          u.uSizePulseMin,
          u.uSizePulseMax,
          sin(time.mul(u.uSizePulseSpeed)).mul(0.5).add(0.5)
        )
      )
      .toVar();

    const dist = length(vUv.sub(center)).toVar();

    // Disc with a noise-deformed edge; everything outside is discarded
    const noise = perlin(
      vUv.mul(u.uNoiseScale).add(time.mul(u.uNoiseSpeed))
    ).toVar();
    const deformationStrength = smoothstep(
      u.uDeformationStart,
      u.uDeformationEnd,
      dist
    );
    const deformedRadius = size
      .add(noise.sub(0.5).mul(u.uDeformationStrength).mul(deformationStrength))
      .toVar();
    If(dist.greaterThan(deformedRadius), () => {
      Discard();
    });

    // Disc-normalized coordinates (edge = radius 1.0), so the flow field
    // grows with the opening
    const portalPosition = vUv.sub(center).div(max(size, 0.001));

    // Two-sample noise flow field deforming the project texture; the center
    // is kept more stable than the rim
    const { distortion, centerStability } = flowField(perlin, portalPosition, {
      scale: u.uDistortionScale,
      speed: u.uDistortionSpeed,
    });

    // Fake interior parallax: intersect the view ray with a virtual plane
    // uParallaxDepth behind the disc, horizontal axis only. Tangent basis
    // straight from the model matrix (the disc faces +Z, u along +X). The z
    // floor keeps grazing angles from smearing the offset to infinity
    const viewDir = positionWorld.sub(cameraPosition);
    const viewDirTangent = normalize(
      vec3(
        dot(viewDir, normalize(modelWorldMatrix.element(0).xyz)),
        dot(viewDir, normalize(modelWorldMatrix.element(1).xyz)),
        dot(viewDir, normalize(modelWorldMatrix.element(2).xyz))
      )
    ).toVar();
    const parallaxOffsetX = viewDirTangent.x
      .div(max(abs(viewDirTangent.z), 0.3))
      .mul(u.uParallaxDepth);

    // Centered square crop of the wide image (u divided by the aspect),
    // shifted by the parallax, deformed by the flow field
    const textureUv = center
      .add(
        vec2(
          vUv.x.sub(0.5).div(u.uTextureAspect).add(parallaxOffsetX),
          vUv.y.sub(0.5)
        )
      )
      .add(
        distortion
          .mul(u.uDistortionStrength)
          .mul(mix(0.3, 1, centerStability))
          .mul(max(size, 0.001))
      );
    // Map into the atlas rect; the clamp stops parallax/distortion from
    // bleeding into neighboring tiles
    const atlasUv = u.uTextureOffset.add(
      clamp(textureUv, vec2(0.001), vec2(0.999)).mul(u.uTextureSize)
    );
    const texColor = texture(screensAtlasTexture, atlasUv).toVar();

    // Lighting and saturation grade. uSaturation > 1 extrapolates the mix —
    // keep boosted colors from going negative (bloom smears negative RGB
    // into black squares)
    const lit = texColor.rgb.mul(u.uLighting);
    const graded = max(adjustSaturation(lit, u.uSaturation), vec3(0));

    // Emissive rim added after the grade so its HDR color reaches the bloom
    // untouched; flickers with the same noise as the edge
    const rim = smoothstep(
      deformedRadius.sub(u.uRimWidth),
      deformedRadius,
      dist
    ).mul(noise.mul(0.9).add(0.55));

    return vec4(
      graded.add(u.uRimColor.mul(rim).mul(u.uRimIntensity)),
      texColor.a
    );
  })();

  return material;
};

// Debug entries for the disc look (the open size lives with the animation)
export const portalDiscControls = uniforms => {
  const d = PORTAL_DISC_DEFAULTS;
  const control = uniformControls(uniforms);
  return {
    sizePulseSpeed: control('uSizePulseSpeed', d.sizePulseSpeed, 0, 10, 0.01),
    sizePulseMin: control('uSizePulseMin', d.sizePulseMin, -0.1, 0.1, 0.001),
    sizePulseMax: control('uSizePulseMax', d.sizePulseMax, -0.1, 0.1, 0.001),
    noiseScale: control('uNoiseScale', d.noiseScale, 0, 5, 0.01),
    noiseSpeed: control('uNoiseSpeed', d.noiseSpeed, 0, 0.5, 0.001),
    deformationStart: control(
      'uDeformationStart',
      d.deformationStart,
      0,
      0.7,
      0.005
    ),
    deformationEnd: control('uDeformationEnd', d.deformationEnd, 0, 0.7, 0.005),
    deformationStrength: control(
      'uDeformationStrength',
      d.deformationStrength,
      0,
      1,
      0.005
    ),
    parallaxDepth: control('uParallaxDepth', d.parallaxDepth, 0, 0.5, 0.005),
    rimColor: control('uRimColor', d.rimColor),
    rimIntensity: control('uRimIntensity', d.rimIntensity, 0, 20, 0.1),
    rimWidth: control('uRimWidth', d.rimWidth, 0, 0.2, 0.001),
    lighting: control('uLighting', d.lighting, 0, 3, 0.01),
    saturation: control('uSaturation', d.saturation, 0, 2, 0.01),
    distortionScale: control('uDistortionScale', d.distortionScale, 0, 3, 0.01),
    distortionStrength: control(
      'uDistortionStrength',
      d.distortionStrength,
      0,
      1,
      0.001
    ),
    distortionSpeed: control(
      'uDistortionSpeed',
      d.distortionSpeed,
      0,
      0.5,
      0.001
    ),
  };
};
