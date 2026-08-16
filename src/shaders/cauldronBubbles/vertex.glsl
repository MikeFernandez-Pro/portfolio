uniform float uTime;
uniform float uSize;
uniform vec2 uResolution;
uniform vec2 uHalfSize;
uniform float uSpread;
uniform float uSpeed;
uniform float uGrowPower;
uniform float uPopStart;

attribute float aPhase;
attribute float aSpeed;
attribute float aSize;

varying float vAlpha;

#define TWO_PI 6.28318530718

float hash(vec2 seed) {
    return fract(sin(dot(seed, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    // Each bubble loops on its own phase and respawns at a new random spot
    // of the surface every cycle, like water at a rolling boil: it stays in
    // place, swells, then bursts
    float progress = uTime * uSpeed * aSpeed + aPhase;
    float t = fract(progress);
    float cycle = floor(progress);

    vec2 seed = vec2(aPhase * 137.13, aSpeed * 91.7) + cycle;
    float angle = hash(seed) * TWO_PI;
    float radius = sqrt(hash(seed + 17.31)) * uSpread;

    vec3 newPosition = vec3(
      cos(angle) * radius * uHalfSize.x,
      0.0,
      sin(angle) * radius * uHalfSize.y
    );

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // The size swells over the whole life (uGrowPower shapes the curve),
    // while the alpha pops sharply at the end instead of shrinking
    float swell = pow(t, uGrowPower);
    vAlpha = smoothstep(0.0, 0.08, t) * (1.0 - smoothstep(uPopStart, 1.0, t));

    gl_PointSize = uSize * uResolution.y * aSize * swell;
    gl_PointSize *= 1.0 / -viewPosition.z;
}
