uniform float uTime;
uniform float uSize;
uniform vec2 uResolution;
uniform float uOpenFactor;
uniform float uSpawnRadius;
uniform float uSwirlTurns;
uniform float uFrontOffset;
uniform float uSpeed;

attribute float aSize;
attribute float aAngle;
attribute float aSpeed;
attribute float aPhase;

varying float vAlpha;

#define TWO_PI 6.28318530718

void main() {
    // Each spark loops on its own phase: spawn on a wide ring in front of
    // the portal, spiral inward and dive into the disc
    float t = fract(uTime * uSpeed * aSpeed + aPhase);
    float ease = t * t * (3.0 - 2.0 * t);

    float radius = mix(uSpawnRadius, 0.06, ease) * uOpenFactor;
    float angle = aAngle + t * uSwirlTurns * TWO_PI;

    vec3 newPosition = vec3(
      cos(angle) * radius,
      sin(angle) * radius,
      uFrontOffset * (1.0 - ease)
    );

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Fade in on spawn, vanish right before reaching the disc; hidden
    // entirely while the portal is closed
    vAlpha = smoothstep(0.0, 0.2, t)
      * (1.0 - smoothstep(0.75, 1.0, t))
      * uOpenFactor;

    // Sparks shrink as they get sucked in
    gl_PointSize = uSize * uResolution.y * aSize * mix(1.0, 0.4, ease);
    gl_PointSize *= 1.0 / -viewPosition.z;
}
