uniform float uUvOffsetX;

varying vec2 vUv;

void main() {
  vUv = uv;
  vUv.x += uUvOffsetX;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
