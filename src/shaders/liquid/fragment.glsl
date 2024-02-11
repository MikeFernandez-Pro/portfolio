uniform float uTime;
uniform vec3 uColorStart;
uniform vec3 uColorEnd;

varying vec2 vUv;

#include ../includes/simplexNoise3d.glsl

void main()
{
    // Displace the UV
    vec2 displacedUv = vUv + snoise(vec3(vUv * 2.5, uTime * 0.2));

    // Perlin noise
    float strength = snoise(vec3(displacedUv * 1., uTime * 0.1));

    // Outer glow
    float outerGlow = distance(vUv, vec2(0.5)) * 5.0 - 1.6;
    strength += outerGlow;

    // Apply cool step
    strength += step(- 0.2, strength) * 0.8;

    // Clamp the value from 0 to 1
    strength = clamp(strength, 0.0, 1.0);

    // Final color
    vec3 color = mix(uColorStart, uColorEnd, strength);

    gl_FragColor = vec4(color, 1.0);
}