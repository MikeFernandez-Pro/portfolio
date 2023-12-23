// Based on Arthur Silveira grass vertex shader
// https://codesandbox.io/p/devbox/grass-shader-new-wwhd8r

#define PI 3.14159265359

uniform float uTime;
uniform vec3 uCharacter;

attribute vec3 floorPosition;

varying float vPosY;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) *
        43758.5453123);
}

void main() {

    // Determine the placement of the blade based on it's floorPosition
    vec3 bladeDefaultPosition = vec3(floorPosition.x, floorPosition.y, floorPosition.z);

    // Offset the blades position to it's world position
    vec3 finalPosition = position + bladeDefaultPosition;

    // Character repel force settings
    float characterDistance = distance(finalPosition, uCharacter); // cursor size
    float maxDistance = 0.5;

    // Update blades tip position based on character distance
    if(characterDistance < maxDistance && position.y > 0.2) {
        vec3 direction = normalize(finalPosition - uCharacter);
        finalPosition.xz += direction.xz * (1.0 - characterDistance / maxDistance) * 0.3;
    }

    // Add a small amount of random movement to every blade of grass, especially to the tip
    float randomSeed = random(floorPosition.xz);
    float randomMovement = sin(uTime + randomSeed * 10.0) * 0.1;

    if(position.y > 0.2) {
        finalPosition.x += randomMovement * position.y; 
        finalPosition.z += randomMovement * position.y;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4(finalPosition, 1.0);

    vPosY = position.y;

}
