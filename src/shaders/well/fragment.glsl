uniform float uTime;
uniform sampler2D uPerlinNoise;
uniform vec3 uOuterWaterColor;
uniform vec3 uInnerWaterColor;
uniform vec3 uFoamColor;

varying vec2 vUv;

void main()
{
    vec2 center = vec2(0.5);
    vec2 centerRope = vec2(0.49, 0.525);
    float distRope = length(vUv - centerRope);
    float dist = length(vUv - center);

    // Water color
    vec3 waterColor = mix(uOuterWaterColor ,uInnerWaterColor, 1.0 - dist * 2.0);

    // Inner Foam
    vec2 noiseUv = vUv  + vec2(uTime * 0.1);
    float noise = texture2D(uPerlinNoise, noiseUv).r;

    float innerFoam  = smoothstep(0.1, 0.001, distRope);
    innerFoam = step(0.5, innerFoam);
     waterColor = mix(waterColor, uFoamColor, innerFoam);
        
    // Outer Foam
    float baseRadius = 0.42;
    float deformedRadius = baseRadius + (noise - 0.5) * 0.1 * dist;

    // Final color
    csm_DiffuseColor = dist > deformedRadius ? vec4(uFoamColor, 1.0) : vec4(waterColor, 1.0);
    csm_DiffuseColor.w = 0.7;


}
