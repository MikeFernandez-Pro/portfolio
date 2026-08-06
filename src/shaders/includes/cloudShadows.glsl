// Cloud shadows: layered perlin noise scrolled over world XZ, darkening the
// surface color. Shared by the island material patch and the grass shader.
uniform float uCloudShadowEnabled;
uniform float uCloudShadowTime;
uniform vec2 uCloudShadowDirection;
uniform float uCloudShadowSpeed;
uniform float uCloudShadowScale;
uniform float uCloudShadowLayers;
uniform float uCloudShadowCoverage;
uniform float uCloudShadowSoftness;
uniform float uCloudShadowDarkness;
uniform float uCloudShadowPower;
uniform sampler2D uCloudShadowNoise;

float cloudShadowFactor(vec2 worldXZ) {
  if (uCloudShadowEnabled < 0.5) {
    return 1.0;
  }

  vec2 cloudUv =
    worldXZ * uCloudShadowScale +
    uCloudShadowDirection * (uCloudShadowTime * uCloudShadowSpeed);

  float cloudField = 0.0;
  float cloudWeight = 0.0;
  float layerWeight = 1.0;
  vec2 layerUv = cloudUv;

  for (int i = 0; i < 6; i++) {
    if (float(i) >= uCloudShadowLayers) {
      break;
    }

    vec2 cUv = layerUv + vec2(17.31, 9.17) * float(i);
    cloudField += texture2D(uCloudShadowNoise, cUv).r * layerWeight;
    cloudWeight += layerWeight;
    layerWeight *= 0.5;
    layerUv *= 2.0;
  }

  cloudField = clamp(cloudField / max(cloudWeight, 0.0001), 0.0, 1.0);

  float inShadow = 1.0 - smoothstep(
    clamp(uCloudShadowCoverage - uCloudShadowSoftness, 0.0, 1.0),
    clamp(uCloudShadowCoverage + uCloudShadowSoftness, 0.0, 1.0),
    cloudField
  );

  float factor = mix(1.0, clamp(uCloudShadowDarkness, 0.0, 1.0), inShadow);

  return pow(factor, max(uCloudShadowPower, 0.001));
}
