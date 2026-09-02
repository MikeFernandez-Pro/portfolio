// Unlit variant (MeshBasicMaterial): the blade color is final, the red tip
// is mixed straight in. No normals, no emissive slot. See fragmentCommon.glsl.
#include ./fragmentCommon.glsl;

void main() {
  float cloudShadow = cloudShadowFactor(vGrassWorldPos.xz);
  float tipMask = grassTipMask();

  // max: MSAA can still nudge centroid samples slightly negative
  csm_DiffuseColor = vec4(
    mix(max(vGrassColor, 0.0), uRedTipColor, tipMask) * cloudShadow,
    1.0
  );
}
