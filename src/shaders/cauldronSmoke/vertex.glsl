uniform float uTime;
uniform float uTimeOffsetStrength;
uniform float uDisplacementUv;
uniform float uDisplacementUvY;
uniform float uSwayEnabled;
uniform float uSwayAmplitude;

varying float positionY;
varying vec2 vUv;
varying float vTime;

void main() {

  // Single column drawn as a plain mesh (CauldronSmoke), so its world matrix
  // is just modelMatrix — no instancing, unlike SmokeColumns
  float timeOffset = fract(
    sin(dot(modelMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453
  ) * 100.0 * uTimeOffsetStrength;
  float time = uTime + timeOffset;

  vec3 newPosition = position;
  // Sway grows with height (uv.y: 0 at the base, 1 at the top), so the base
  // stays anchored to the cauldron whatever the amplitude; swayPower shapes
  // the curve (higher = sway concentrated near the top). The epsilon keeps
  // pow(0, 0) out of undefined territory when swayPower is 0
  if (uSwayEnabled > 0.5) {
    float heightFactor = pow(uv.y, max(uDisplacementUvY, 0.0001));
    newPosition.x += sin(newPosition.y * uDisplacementUv - time) * heightFactor * uSwayAmplitude;
  }

  vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);

  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  gl_Position = projectedPosition;

  vUv = uv;
  positionY = newPosition.y;
  vTime = time;
}