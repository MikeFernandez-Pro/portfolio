varying vec2 vUv;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vUv = uv;
}

// varying vec2 vUv;

// void main() {
//     gl_Position = projectionMatrix * modelViewMatrix * vec4(position,  1.0);
//     vUv = uv;
// }