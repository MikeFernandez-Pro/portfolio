#include ../includes/rotate2d.glsl

#define PI 3.1415926

uniform float uTime;
uniform float uSize;
uniform sampler2D uTextureMap;
uniform sampler2D uPerlinTexture;

varying vec2 vUv;

void main() {
    vec2 center = vec2(0.5);
    float baseRadius =  uSize;
    
    float dist = length(vUv - center);

    float noise = texture2D(uPerlinTexture, vUv * 1.0 + uTime * 0.05).r;

    float deformationStrength = smoothstep(0.3, 0.4, dist);
    float deformedRadius = baseRadius + (noise - 0.5) * 0.3 * deformationStrength;

    if (dist > deformedRadius) {
        discard;
    }
  
    vec2 displacedUv = rotate2d(uTime * 0.3 + noise) * vUv ;
    float noise2 = texture2D(uPerlinTexture, displacedUv).r;
    noise2 = step(0.5, noise2);


    vec4 texColor = texture2D(uTextureMap, vUv);    
    texColor.rgb = mix(texColor.rgb, texColor.rgb *2.0, noise2 * 0.5);
    
    gl_FragColor = texColor;
}
