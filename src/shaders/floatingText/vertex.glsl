uniform float uTime;

varying vec2 vUv;

void main()
{
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    

    modelPosition.y += sin(modelPosition.x * 10.0 + uTime) * 0.02;
    modelPosition.y += sin(modelPosition.y * 0.5 + uTime) * 0.01;


    vec4 viewPosition = viewMatrix * modelPosition;


    vec4 projectionPosition = projectionMatrix * viewPosition;

    gl_Position = projectionPosition;

    vUv = uv;
}