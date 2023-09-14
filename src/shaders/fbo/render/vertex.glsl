attribute vec3 aColor;
attribute vec2 aUv;
attribute float aScale;

uniform sampler2D uPosition;
uniform float uSize;
uniform float uTime;
uniform float uScaleRatio;

varying vec3 vColor;

void main() {
    vColor = aColor;

    vec3 pos = texture2D(uPosition, aUv).rgb;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * aScale * uScaleRatio;

}