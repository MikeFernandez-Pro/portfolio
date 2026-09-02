// Lit variant (MeshStandardMaterial): scene lighting on a smooth shading
// normal, red tip through the emissive slot. See fragmentCommon.glsl.
#include ./fragmentCommon.glsl;

// Smooth shading (view space): normal following the blade bend, and the edge
// tilt of the fake rounded cross-section
centroid varying vec3 vGrassBendNormal;
centroid varying vec3 vGrassSideTilt;

void main() {
  float cloudShadow = cloudShadowFactor(vGrassWorldPos.xz);
  float tipMask = grassTipMask();

  // The bend normal flips on back faces (DoubleSide), the edge tilt does
  // not, so the rounding reads the same from either side
  // max: extrapolated samples can cancel the sum, and normalize(0) is NaN
  vec3 fragNormal =
    vGrassBendNormal * (gl_FrontFacing ? 1.0 : -1.0) + vGrassSideTilt;
  csm_FragNormal = fragNormal / max(length(fragNormal), 1e-5);

  // The tip goes through the emissive slot (added after the lighting
  // equation) so the scene lights neither darken nor tint it; the diffuse
  // underneath is faded out so no lit green bleeds through. It still
  // receives the cloud shadows like the rest of the blade.
  // max: MSAA can still nudge centroid samples slightly negative
  csm_DiffuseColor = vec4(max(vGrassColor, 0.0) * (1.0 - tipMask) * cloudShadow, 1.0);
  csm_Emissive = uRedTipColor * tipMask * cloudShadow;
}
