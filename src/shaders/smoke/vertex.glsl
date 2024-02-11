uniform float uTime;
uniform float uDisplacementUv;
uniform float uDisplacementUvY;
uniform float newPositionY;

varying float positionY;
varying vec2 vUv;

#include ../includes/perlin2d.glsl

void main() {

  vec3 newPosition = position;
  vec2 displacementUv = uv;
  displacementUv *= uDisplacementUv;
  displacementUv.y -= uTime * uDisplacementUvY;

  float displacementStrength = pow(uv.y * 30.0, 30.0);
  float perlin = perlin2d(uv * 0.1) * displacementStrength;

  newPosition.z += perlin * newPositionY;

  vec3 testPosition = position;
  testPosition.x += sin(testPosition.y * uDisplacementUv - uTime) * pow(testPosition.y, uDisplacementUvY) * 0.1;

  vec4 modelPosition = modelMatrix * vec4(testPosition, 1.0);

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  vUv = uv;
  positionY = testPosition.y;
}