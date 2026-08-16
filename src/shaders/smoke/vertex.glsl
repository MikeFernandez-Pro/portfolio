uniform float uTime;
uniform float uTimeOffsetStrength;
uniform float uDisplacementUv;
uniform float uDisplacementUvY;
uniform float newPositionY;

varying float positionY;
varying vec2 vUv;
varying float vTime;

#include ../includes/perlin2d.glsl

void main() {

  // Columns are drawn as instances of a single mesh (SmokeColumns) or as a
  // plain mesh (bonfire): resolve the column's own world matrix either way
  mat4 columnMatrix = modelMatrix;
  #ifdef USE_INSTANCING
    columnMatrix = modelMatrix * instanceMatrix;
  #endif

  // Columns sharing a material get a per-column time offset hashed from
  // their world position, so their sway/scroll patterns aren't in sync;
  // uTimeOffsetStrength scales the desynchronization (0 = all in phase)
  float timeOffset = fract(
    sin(dot(columnMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453
  ) * 100.0 * uTimeOffsetStrength;
  float time = uTime + timeOffset;

  vec3 newPosition = position;
  vec2 displacementUv = uv;
  displacementUv *= uDisplacementUv;
  displacementUv.y -= time * uDisplacementUvY;

  float displacementStrength = pow(uv.y * 30.0, 30.0);
  float perlin = perlin2d(uv * 0.1) * displacementStrength;

  newPosition.z += perlin * newPositionY;

  vec3 testPosition = position;
  testPosition.x += sin(testPosition.y * uDisplacementUv - time) * pow(testPosition.y, uDisplacementUvY) * 0.1;

  vec4 modelPosition = columnMatrix * vec4(testPosition, 1.0);

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  vUv = uv;
  positionY = testPosition.y;
  vTime = time;
}