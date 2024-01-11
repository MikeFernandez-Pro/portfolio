uniform float uPixelRatio;
uniform float uSize;
uniform float uTime;
uniform float uVelocity;

attribute float aScale;
varying float vScale;

void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    modelPosition.x += sin(modelPosition.y + uTime + (aScale * 15.0)) * uVelocity;
    modelPosition.y += sin(modelPosition.x + uTime + (aScale * 15.0)) * uVelocity + 0.1;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;
    gl_PointSize = uSize * aScale * uPixelRatio;
    gl_PointSize *= (1.0 / -viewPosition.z);

    vScale = aScale;
}