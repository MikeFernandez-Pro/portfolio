#include ../includes/simplexNoise3d.glsl
#include ../includes/rotate2d.glsl

uniform float progress;
uniform float size;
uniform float aspectRatio;
uniform float uTime;

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {

    vec2 centeredUv = vUv - 0.5;
    centeredUv.y /= aspectRatio;

    float distanceToCenter = length(centeredUv / progress);

    centeredUv = rotate2d(sin(progress) * 3.141592) * centeredUv;

    float perlinNoise = snoise(vec3(centeredUv.x * size, centeredUv.y * size, uTime * 0.15));

    if(distanceToCenter - perlinNoise * 0.1 > progress)
        discard;

    outputColor = inputColor;
}