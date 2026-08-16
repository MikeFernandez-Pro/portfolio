uniform vec3 uColor;
uniform float uOpacity;
uniform float uFadeHeight;
uniform float uBaseFade;

varying float positionY;
varying vec2 vUv;
varying float vTime;

#include ../includes/perlin2d.glsl

void main() {

    vec2 uv = vec2(vUv.x, vUv.y);
    uv.y -= vTime;

    float borderAlpha = min(vUv.x * 30.0, (1.0 - vUv.x) * 30.0);
    borderAlpha *= 1.0 - vUv.y;
    
    float perlin = perlin2d(uv);
    perlin *= borderAlpha;
    
    vec3 color = uColor;

    // uFadeHeight stretches the vertical fade, uOpacity scales the whole
    // column (defaults 1.0 / 0.5 match the original hardcoded look)
    float alpha = min(1.0, (uFadeHeight / positionY) * borderAlpha) * uOpacity;

    // Soften the column base so it doesn't draw a hard line where the plane
    // intersects the surface it rises from (0 = off)
    alpha *= smoothstep(0.0, max(uBaseFade, 0.0001), positionY);

    gl_FragColor = vec4(color, alpha);
}