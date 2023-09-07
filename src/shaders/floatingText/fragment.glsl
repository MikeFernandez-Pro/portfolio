uniform float uOpacity;

varying vec2 vUv;

void main()
{
    gl_FragColor = vec4(0.97, 0.37, 0.24, uOpacity) * 2.5;
}