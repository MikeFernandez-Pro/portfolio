#include ../includes/rotate2d.glsl

uniform float progress;
uniform float size;
uniform float aspectRatio;
uniform float uTime;
uniform sampler2D uPerlinNoiseTexture;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

    vec2 centeredUv = vUv - 0.5;
    centeredUv.y /= aspectRatio;

    float scaledProgress = progress / aspectRatio;

    float distanceToCenter = length(centeredUv / scaledProgress);

    centeredUv = rotate2d(sin( -uTime * 0.05) * 3.141592) * centeredUv;

    // float perlinNoise = snoise(vec3(centeredUv.x * size, centeredUv.y * size, uTime * 0.15));
    vec2 perlinUv = vec2(centeredUv.x * size + uTime * 0.05, centeredUv.y * size + uTime * 0.05);
    // perlin = green channel of the packed voronoi/perlin texture
    float perlinNoise = texture2D(uPerlinNoiseTexture, perlinUv).g;

    if(distanceToCenter - perlinNoise * 0.5 > scaledProgress)
        discard;

    outputColor = inputColor;
}