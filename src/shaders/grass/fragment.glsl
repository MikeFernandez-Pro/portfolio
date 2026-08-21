#include ../includes/cloudShadows.glsl;

uniform vec3 uRedTipColor;
uniform float uRedTipLength; // portion of the blade covered by the red tip (0-1)

varying vec3 vGrassColor;
varying vec2 vGrassUv; // x: flower flag, y: height percent along the blade
varying vec3 vGrassWorldPos;

void main() {
  float cloudShadow = cloudShadowFactor(vGrassWorldPos.xz);

  // Flower blades fade to red towards the tip. The tip goes through the
  // emissive slot (added after the lighting equation) so the scene lights
  // neither darken nor tint it; the diffuse underneath is faded out so no
  // lit green bleeds through. It still receives the cloud shadows like the
  // rest of the blade.
  float tipMask = vGrassUv.x > 0.5
    ? smoothstep(1.0 - uRedTipLength, 1.0, vGrassUv.y)
    : 0.0;

  // Albedo only: MeshStandardMaterial's lighting shades it from here
  csm_DiffuseColor = vec4(vGrassColor * (1.0 - tipMask) * cloudShadow, 1.0);
  csm_Emissive = uRedTipColor * tipMask * cloudShadow;
}
