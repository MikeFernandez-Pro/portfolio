uniform float uTime;
uniform sampler2D uPerlinNoise;
uniform float uInnerPerlinStrength;
uniform float uOuterPerlinStrength;
uniform vec3 uOuterWaterColor;
uniform vec3 uInnerWaterColor;
uniform vec3 uFoamColor;
uniform float uInnerCircleRadius;
uniform float uInnerCircleThickness;
uniform vec2 uInnerCircleOffset;
uniform float uOuterCircleRadius;
uniform float uOuterCircleThickness;

varying vec2 vUv;

void main()
{
    vec2 noiseUv = vUv + vec2(uTime * 0.05);
    float noise = texture2D(uPerlinNoise, noiseUv).r;
    float innerDeformation = (noise - 0.5) * uInnerPerlinStrength;
    float outerDeformation = (noise - 0.5) * uOuterPerlinStrength;

    float dist = length(vUv - vec2(0.5));
    float innerDist = length(vUv - (vec2(0.5) + uInnerCircleOffset));

    // Radial water fill: outer color at the rim → inner color at the center
    float waterMix = clamp(1.0 - dist * 2.0, 0.0, 1.0);
    vec3 waterColor = mix(uOuterWaterColor, uInnerWaterColor, waterMix);

    float innerCircle =
      1.0 - smoothstep(
        uInnerCircleThickness,
        uInnerCircleThickness + 0.005,
        abs(innerDist - (uInnerCircleRadius + innerDeformation))
      );

    float outerCircle =
      1.0 - smoothstep(
        uOuterCircleThickness,
        uOuterCircleThickness + 0.005,
        abs(dist - (uOuterCircleRadius + outerDeformation))
      );

    // Foam rings sit on top of the water gradient
    vec3 color = mix(waterColor, uFoamColor, max(innerCircle, outerCircle));

    csm_DiffuseColor = vec4(color, 0.7);
}
