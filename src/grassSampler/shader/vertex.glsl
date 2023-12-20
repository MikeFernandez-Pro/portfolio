// Based on Arthur Silveira grass vertex shader
// https://codesandbox.io/p/devbox/grass-shader-new-wwhd8r

#define PI 3.14159265359

uniform float uTime;
uniform vec3 uMouse;

attribute vec3 terrainPosition;

varying float vPosY;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) *
        43758.5453123);
}

mat2 rotate2d(float _angle) {
    return mat2(cos(_angle), -sin(_angle), sin(_angle), cos(_angle));
}

void main() {

    // Determine the center of the blade using the terrain position
    vec3 bladeCenter = vec3(terrainPosition.x, terrainPosition.y, terrainPosition.z);

    // Offset the rotated position by the blade's center in the world
    vec3 finalPosition = position + bladeCenter;

    // Mouse repel force

    float mouseDistance = distance(finalPosition, uMouse); // cursor size
    float maxDistance = 0.5;

    if(mouseDistance < maxDistance && position.y > 0.2) {
        vec3 direction = normalize(finalPosition - uMouse);
        finalPosition.xz += direction.xz * (1.0 - mouseDistance / maxDistance) * 0.3;
    }

    // WIND LOGIC

    // Add a small amount of random movement to every blade of grass, especially to the tip
    float randomSeed = random(terrainPosition.xz);
    float randomMovement = sin(uTime + randomSeed * 10.0) * 0.1; // Adjust 0.05 for intensity

    if(position.y > 0.2) {
        finalPosition.x += randomMovement * position.y; // Amplify the randomness at the tip
        finalPosition.z += randomMovement * position.y; // Amplify the randomness at the tip
    }

    // FINAL RENDER
    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);

    vPosY = position.y;

}
