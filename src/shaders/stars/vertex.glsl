uniform float uSize;
uniform vec2 uResolution;
uniform float uTime;

attribute float aSize;
attribute float aColor;

varying float vColor;

void main()
{   
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    gl_PointSize = aSize * uSize * uResolution.y *  (0.1 * sin(uTime * 5.0 + (aSize * 10.0)) + 0.9);
    gl_PointSize *= 1.0 / - viewPosition.z;


    vColor = aColor;    
}