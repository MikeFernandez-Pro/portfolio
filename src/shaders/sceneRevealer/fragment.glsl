#include ../includes/simplexNoise3d.glsl
#include ../includes/rotate2d.glsl

uniform float progress;
uniform float size;
uniform float aspectRatio;
uniform float uTime;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

    vec2 centeredUv = uv - 0.5;
    centeredUv.y /= aspectRatio;

    float safeProgress = max(abs(progress), 1e-5);
    float distanceToCenter = length(centeredUv / safeProgress);

    centeredUv = rotate2d(sin(progress) * 3.141592) * centeredUv;

    float perlinNoise = snoise(vec3(centeredUv.x * size, centeredUv.y * size, uTime * 0.15));

    // Pixel-width AA on the radial field only — fwidth(noise) is unstable and
    // turns the contour into stairs. Discard did the same (aliased iso-line).
    float shape = distanceToCenter - progress;
    float w = max(fwidth(shape), 1e-5);
    float mask = 1.0 - smoothstep(-w, w, shape - perlinNoise * 0.1);

    // The MSAA-resolved scene buffer can carry negative/NaN RGB (extrapolated
    // varyings) — keep the clamp even though this now runs post-bloom, so the
    // debug MSAA A/B doesn't feed them to SMAA
    outputColor = vec4(max(inputColor.rgb, vec3(0.0)), inputColor.a) * mask;
}
