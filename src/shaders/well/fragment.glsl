uniform float uTime;
uniform sampler2D uPerlinNoise;
uniform vec3 uWaterColor;
uniform vec3 uFoamColor;

varying vec2 vUv;

#include ../includes/rotate2d.glsl

void main()
{
    vec2 center = vec2(0.5);
    vec2 centerRope = vec2(0.49, 0.52);
    float distRope = length(vUv - centerRope);
    float dist = length(vUv - center);
    
    // Ripples
    vec2 rotatedUV = vUv  + vec2(uTime * 0.1);
    float noise = texture2D(uPerlinNoise, rotatedUV * 1.0).r;

    float rippleSpacing = 0.05;

    float modDist = mod(distRope + (noise - 0.5) * 0.03, rippleSpacing);

    float maxRippleDistance = 0.15;
    float rippleMask = smoothstep(maxRippleDistance, maxRippleDistance - 0.05, distRope);

    float ripple = smoothstep(0.01, 0.001, modDist) * rippleMask;

 
    // Water color
    vec3 waterColor = uWaterColor * (1.0-distRope);
     waterColor = mix(waterColor, uFoamColor, ripple);
    

    // Outer foam 
    float baseRadius = 0.42;

    float noise2 = texture2D(uPerlinNoise, vUv * rotate2d(uTime * 0.1)).r;

    float deformedRadius = baseRadius + (noise - 0.5) * 0.1 * dist;


    // Final color
    csm_DiffuseColor = dist > deformedRadius ? vec4(uFoamColor, 1.0) : vec4(waterColor, 1.0);
    
}
