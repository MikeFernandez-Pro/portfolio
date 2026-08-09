#include ../includes/rotate2d.glsl

#define PI 3.1415926
#define TWO_PI 6.28318530718

// Provided by <tonemapping_pars_fragment> when tone mapping is on; defined
// here as a fallback since this is a raw ShaderMaterial
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif

uniform float uTime;
uniform float uSize;
uniform sampler2D uTextureMap;
uniform sampler2D uPerlinTexture;

// Idle pulse: the open disc radius breathes between the two amplitudes
uniform float uSizePulseSpeed;
uniform float uSizePulseMin;
uniform float uSizePulseMax;

// Disc edge (original projects portal look)
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uDeformationStart;
uniform float uDeformationEnd;
uniform float uDeformationStrength;

// How much the swirl's distortion field warps the project texture,
// relative to the swirl's own uDistortionStrength (1 = same amount).
// The texture never rotates, it only gets pushed around by the noise.
uniform float uTextureDistortion;

// Final grade applied to the whole disc
uniform float uLighting;
uniform float uSaturation;

// Swirl overlay, ported from the cauldron potion portal (background veil
// and filaments only). Coordinates are normalized so radius 1.0 sits on
// the open disc edge, which makes the swirl grow with the opening.
uniform vec3 uDeepColor;
uniform vec3 uMidColor;
uniform vec3 uBrightColor;
uniform float uSwirlOpacity;

uniform float uDistortionScale;
uniform float uDistortionStrength;
uniform float uDistortionSpeed;
uniform float uSwirlRotationSpeed;

uniform float uBackgroundStrength;
uniform float uBackgroundCloudContrast;

uniform float uFilamentStrength;
uniform float uFilamentCount;
uniform float uFilamentWidth;
uniform float uFilamentTwist;
uniform float uFilamentSpeed;
uniform float uFilamentBreakup;

varying vec2 vUv;

float samplePerlinNoise(vec2 uv) {
  return texture2D(uPerlinTexture, uv).r;
}

float stripeMask(float phase, float width, float softness) {
  float distanceToCenter = abs(fract(phase) - 0.5);

  return 1.0 - smoothstep(width, width + softness, distanceToCenter);
}

// Layer 1: a flat, cloudy veil (no radial glow, so nothing forms at the
// center of the disc)
float getBackgroundLayer(float broadNoise) {
  float clouds = mix(
    1.0,
    smoothstep(0.18, 0.82, broadNoise),
    uBackgroundCloudContrast
  );

  return clouds * uBackgroundStrength;
}

// Layer 2: sparse thin spiral lines.
float getFilamentLayer(
  float radius,
  float angle,
  float broadNoise,
  float detailNoise
) {
  float phase = radius * uFilamentCount
    - angle * uFilamentTwist / TWO_PI
    + uTime * uFilamentSpeed;
  phase += (broadNoise - 0.5) * 1.7;

  float filament = stripeMask(phase, uFilamentWidth, 0.024);
  float sparseSections = smoothstep(
    uFilamentBreakup,
    min(1.0, uFilamentBreakup + 0.18),
    detailNoise
  );
  float radialEnvelope = smoothstep(0.1, 0.25, radius)
    * (1.0 - smoothstep(0.78, 1.04, radius));

  return filament
    * sparseSections
    * radialEnvelope
    * uFilamentStrength;
}

void main() {
    // Disc with a noise-deformed edge; everything outside is discarded
    vec2 center = vec2(0.5);

    // Size pulse animation on top of the (animated) base size
    float size = uSize + mix(
      uSizePulseMin,
      uSizePulseMax,
      sin(uTime * uSizePulseSpeed) * 0.5 + 0.5
    );
    float baseRadius = size;

    float dist = length(vUv - center);

    float noise = texture2D(uPerlinTexture, vUv * uNoiseScale + uTime * uNoiseSpeed).r;

    float deformationStrength = smoothstep(uDeformationStart, uDeformationEnd, dist);
    float deformedRadius = baseRadius + (noise - 0.5) * uDeformationStrength * deformationStrength;

    if (dist > deformedRadius) {
        discard;
    }

    // Potion portal swirl in disc-normalized coordinates (edge = radius 1.0)
    vec2 portalPosition = (vUv - center) / max(size, 0.001);

    // One shared three-sample flow field drives every swirl layer and the
    // texture deformation.
    vec2 noiseUv = portalPosition * uDistortionScale * 0.42
      + vec2(uTime * uDistortionSpeed, -uTime * uDistortionSpeed * 0.73);
    float noiseX = samplePerlinNoise(noiseUv);
    float noiseY = samplePerlinNoise(noiseUv + vec2(17.31, 41.73));
    float detailNoise = samplePerlinNoise(
      noiseUv * 2.67 + vec2(-9.17, 13.41)
    );

    vec2 distortion = vec2(noiseX, noiseY) * 2.0 - 1.0;
    float swirlBaseRadius = length(portalPosition);
    float centerStability = smoothstep(0.02, 0.55, swirlBaseRadius);
    vec2 flowPosition = rotate2d(uTime * uSwirlRotationSpeed) * portalPosition;
    flowPosition += distortion
      * uDistortionStrength
      * mix(0.3, 1.0, centerStability);

    float radius = length(flowPosition);
    float angle = atan(flowPosition.y, flowPosition.x);
    float broadNoise = mix(noiseX, noiseY, 0.5);

    // Project texture, deformed by the swirl's distortion field only —
    // same displacement the vortex layers get, minus the rotation
    vec2 textureUv = vUv
      + distortion
        * uDistortionStrength
        * mix(0.3, 1.0, centerStability)
        * uTextureDistortion
        * max(size, 0.001);
    vec4 texColor = texture2D(uTextureMap, textureUv);

    float background = getBackgroundLayer(broadNoise);
    float filaments = getFilamentLayer(radius, angle, broadNoise, detailNoise);

    vec3 swirlColor = mix(
      uDeepColor * 0.42,
      uMidColor,
      saturate(background * 0.72)
    );
    swirlColor += uBrightColor * filaments;

    // The swirl covers the texture where it is intense and lets the project
    // image show through everywhere else
    float swirlIntensity = saturate(background * 0.72 + filaments);
    texColor.rgb = mix(texColor.rgb, swirlColor, swirlIntensity * uSwirlOpacity);

    // Lighting and saturation grade on the final disc color
    texColor.rgb *= uLighting;
    float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(luminance), texColor.rgb, uSaturation);

    gl_FragColor = texColor;

   #include <tonemapping_fragment>
    #include <colorspace_fragment>
}
