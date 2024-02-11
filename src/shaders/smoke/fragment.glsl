uniform float uTime;
uniform vec3 uColor; 

varying float positionY;
varying vec2 vUv;

#include ../includes/perlin2d.glsl

void main() {

    vec2 uv = vec2(vUv.x, vUv.y);
    uv.y -= uTime;

    float borderAlpha = min(vUv.x * 30.0, (1.0 - vUv.x) * 30.0);
    borderAlpha *= 1.0 - vUv.y;
    
    float perlin = perlin2d(uv);
    perlin *= borderAlpha;
    
    vec3 color = uColor;

    gl_FragColor = vec4(color, min(1.0, (1.0 / positionY) * borderAlpha) / 2.0 );
}