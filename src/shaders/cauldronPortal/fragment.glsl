// Ported from an earlier project's ending portal shader. Differences: perlin
// noise comes from the green channel of the repeating packed voronoi/perlin
// texture, and the depth-intersection layer is dropped (no depth prepass here).
// `saturate` and `PI` come from three's <common> chunk — do not redefine.

uniform vec3 uDeepColor;
uniform vec3 uMidColor;
uniform vec3 uBrightColor;
uniform float uOpacity;

uniform float uDistortionScale;
uniform float uDistortionStrength;
uniform float uDistortionSpeed;
uniform float uRotationSpeed;

uniform float uBackgroundStrength;
uniform float uBackgroundCenterGlow;
uniform float uBackgroundFalloff;
uniform float uBackgroundCloudContrast;

uniform float uRibbonStrength;
uniform float uRibbonCount;
uniform float uRibbonWidth;
uniform float uRibbonTwist;
uniform float uRibbonSpeed;
uniform float uRibbonBreakup;

uniform float uFilamentStrength;
uniform float uFilamentCount;
uniform float uFilamentWidth;
uniform float uFilamentTwist;
uniform float uFilamentSpeed;
uniform float uFilamentBreakup;

uniform float uCoreStrength;
uniform float uCoreRadius;
uniform float uCoreSoftness;
uniform float uCoreHalo;
uniform float uCorePulseAmount;
uniform float uCorePulseSpeed;

uniform sampler2D uPerlinNoise;
uniform float uTime;

varying vec2 vPortalPosition;

#define TWO_PI 6.28318530718

mat2 rotate2d(float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  return mat2(cosine, -sine, sine, cosine);
}

float samplePerlinNoise(vec2 uv) {
  return texture2D(uPerlinNoise, uv).g;
}

float stripeMask(float phase, float width, float softness) {
  float distanceToCenter = abs(fract(phase) - 0.5);

  return 1.0 - smoothstep(width, width + softness, distanceToCenter);
}

// Layer 1: a soft, cloudy volume that gives the brighter strokes depth.
float getBackgroundLayer(float radius, float broadNoise) {
  float radialLight = pow(saturate(1.0 - radius), uBackgroundFalloff);
  float clouds = mix(
    1.0,
    smoothstep(0.18, 0.82, broadNoise),
    uBackgroundCloudContrast
  );
  float depth = mix(0.26, 1.0, radialLight) * clouds;
  float centerGlow = radialLight * radialLight * uBackgroundCenterGlow;

  return (depth + centerGlow) * uBackgroundStrength;
}

// Layer 2: broad broken spirals, responsible for the painted vortex body.
float getRibbonLayer(
  float radius,
  float angle,
  float broadNoise,
  float detailNoise
) {
  float phase = radius * uRibbonCount
    - angle * uRibbonTwist / TWO_PI
    - uTime * uRibbonSpeed;
  phase += (broadNoise - 0.5) * 0.9;

  float ribbon = stripeMask(phase, uRibbonWidth, 0.065);
  float breakup = smoothstep(
    uRibbonBreakup * 0.72,
    min(1.0, uRibbonBreakup * 0.72 + 0.3),
    mix(broadNoise, detailNoise, 0.42)
  );
  float radialEnvelope = smoothstep(0.04, 0.16, radius)
    * (1.0 - smoothstep(0.86, 1.08, radius));

  return ribbon
    * mix(0.62, 1.0, detailNoise)
    * breakup
    * radialEnvelope
    * uRibbonStrength;
}

// Layer 3: sparse thin lines laid over the broad brush strokes.
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

// Layer 4: a hot center disc plus a wider soft halo.
float getCoreLayer(float radius) {
  float pulse = 1.0
    + sin(uTime * uCorePulseSpeed * TWO_PI) * uCorePulseAmount;
  float coreRadius = uCoreRadius * pulse;
  float core = 1.0 - smoothstep(
    coreRadius,
    coreRadius + uCoreSoftness,
    radius
  );
  float halo = 1.0 - smoothstep(
    coreRadius,
    coreRadius + uCoreSoftness * 3.2,
    radius
  );

  return (core + halo * uCoreHalo) * uCoreStrength;
}

void main() {
  vec2 portalPosition = vPortalPosition;
  float baseRadius = length(portalPosition);

  // One shared three-sample flow field drives every visual layer.
  vec2 noiseUv = portalPosition * uDistortionScale * 0.42
    + vec2(uTime * uDistortionSpeed, -uTime * uDistortionSpeed * 0.73);
  float noiseX = samplePerlinNoise(noiseUv);
  float noiseY = samplePerlinNoise(noiseUv + vec2(17.31, 41.73));
  float detailNoise = samplePerlinNoise(
    noiseUv * 2.67 + vec2(-9.17, 13.41)
  );

  vec2 distortion = vec2(noiseX, noiseY) * 2.0 - 1.0;
  float centerStability = smoothstep(0.02, 0.55, baseRadius);
  vec2 flowPosition = rotate2d(uTime * uRotationSpeed) * portalPosition;
  flowPosition += distortion
    * uDistortionStrength
    * mix(0.3, 1.0, centerStability);

  float radius = length(flowPosition);
  float angle = atan(flowPosition.y, flowPosition.x);
  float broadNoise = mix(noiseX, noiseY, 0.5);

  float background = getBackgroundLayer(radius, broadNoise);
  float ribbons = getRibbonLayer(
    radius,
    angle,
    broadNoise,
    detailNoise
  );
  float filaments = getFilamentLayer(
    radius,
    angle,
    broadNoise,
    detailNoise
  );
  float core = getCoreLayer(radius);

  vec3 color = mix(
    uDeepColor * 0.42,
    uMidColor,
    saturate(background * 0.72)
  );
  color += uMidColor * ribbons * 0.72;
  color += uBrightColor * ribbons * ribbons * 0.26;
  color += uBrightColor * filaments;
  color += uBrightColor * core;

  float discAlpha = 1.0 - smoothstep(0.96, 1.06, baseRadius);
  float alpha = discAlpha * uOpacity;

  if (alpha < 0.003) {
    discard;
  }

  csm_DiffuseColor = vec4(color, alpha);
}
