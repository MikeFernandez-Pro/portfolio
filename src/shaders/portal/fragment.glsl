uniform float uTime;
uniform float uSize;
uniform sampler2D uTextureMap; // The texture uniform
uniform float uContrast;
uniform float uLightIntensity;

varying vec2 vUv;

#include ../includes/simplexNoise3d.glsl

void main() {

    float distanceToCenter = length(vUv - 0.5);

    // Initial Noise 
    float noise = snoise(vec3(vUv * 7., uTime * 0.5));

    // Displace the UV
    vec2 displacedUv = vUv + noise;

    // Outer noise
    if(distanceToCenter - noise * 0.3 > uSize) {
        gl_FragColor = vec4(0.1, 0.05, 0.05, 0.0);
        return;
    }

    // Perlin noise
    float strength = snoise(vec3(displacedUv * 0.3, uTime * 0.001));

    // Apply cool step
    // strength += step(- 0.3, strength) * 0.1;

    // Clamp the value from 0 to 1
    strength = clamp(strength, 0.0, 1.0);

    // Texture
    vec4 texColor = texture2D(uTextureMap, vUv + (noise * 0.02));
    texColor.rgb = (texColor.rgb - 0.5) * uContrast + uLightIntensity;

    gl_FragColor = mix(texColor, texColor * 0.85, strength * 15.);
}
