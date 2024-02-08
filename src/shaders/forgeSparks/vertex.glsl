uniform float uSize;
uniform vec2 uResolution;
uniform float uTime;
uniform float uElevation;

attribute float aSize;
attribute float aAngle;
attribute float aSpeed;


#define PI 3.1415926535897932384626433832795

float remap(float value, float originMin, float originMax, float destinationMin, float destinationMax)
{
    return destinationMin + (value - originMin) * (destinationMax - destinationMin) / (originMax - originMin);
}

void main()
{
    float radius = 0.2;
    float height = 0.3;
    float elevation = uElevation == 1.0 ? 0.0 : uElevation;

    vec3 randomDirection = normalize(vec3(cos(aAngle), 0, sin(aAngle)));

    vec3 newPosition = position;
    newPosition.x += randomDirection.x * radius;
    newPosition.y = aSpeed  * height; 
    newPosition.z += randomDirection.z * radius;

    // Exploding
    float explodingProgress = remap(elevation, 0.0, 0.4, 0.0, 1.0);
    
    newPosition *= explodingProgress;

    // Final position
    vec4 modelPosition = modelMatrix * vec4(newPosition, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    gl_Position = projectionMatrix * viewPosition;

    // Final size
    gl_PointSize = uSize * uResolution.y * aSize;
    gl_PointSize = min(gl_PointSize, gl_PointSize / (newPosition.y * 10.0));
    gl_PointSize *= 1.0 / - viewPosition.z;

}