uniform float uSize;
uniform float uTime;
uniform float uSpeed;

attribute float aScale;
attribute float aElevation;
attribute vec3 aOffset;

varying float vPosY;

void main() {
                /**
                 * Position
                 */
    vec3 newPosition = position;

    newPosition.y = mod(uTime * uSpeed, aElevation) * 0.03;

    newPosition.x /= max(0.9, (newPosition.y) * 10.0);
    newPosition.x += cos(newPosition.y * 30.0) * 0.01;

    vPosY = newPosition.y;

    newPosition.y += aOffset.y;
    newPosition.x += aOffset.x;
    newPosition.z += aOffset.z;

    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

                /**
                 * Size
                 */

    gl_PointSize = min((uSize * aScale), pow((uSize * aScale) / ((newPosition.y - aOffset.y) * (uSize * aScale)), 2.0) * 10.0);
    gl_PointSize *= (1.0 / -viewPosition.z);
}