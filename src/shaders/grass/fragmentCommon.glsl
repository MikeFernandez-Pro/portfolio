// Shared by fragment.glsl (lit, MeshStandardMaterial) and fragmentUnlit.glsl
// (MeshBasicMaterial). Two files instead of one #ifdef: CSM checks the csm_*
// keywords with a plain string search, so csm_Emissive / csm_FragNormal must
// not appear at all in the unlit shader source.
#include ../includes/cloudShadows.glsl;

uniform vec3 uRedTipColor;
uniform float uRedTipLength; // portion of the blade covered by the red tip (0-1)

// centroid: the blades are thin triangles; with MSAA the pixel center can
// fall outside them and extrapolate the varyings past their vertex range
centroid varying vec3 vGrassColor;
centroid varying vec2 vGrassUv; // x: flower flag, y: height percent along the blade
centroid varying vec3 vGrassWorldPos;

// Flower blades fade to red towards the tip
float grassTipMask() {
  // max: a tip length of 0 makes both smoothstep edges 1.0, which is NaN
  // exactly at the tip (vGrassUv.y == 1.0)
  return vGrassUv.x > 0.5
    ? smoothstep(1.0 - max(uRedTipLength, 1e-5), 1.0, vGrassUv.y)
    : 0.0;
}
