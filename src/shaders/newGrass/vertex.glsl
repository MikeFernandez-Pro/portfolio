#define PI 3.14159

uniform vec4 uGrassParams;
uniform sampler2D uPerlinNoiseTexture;
uniform float uTime;
uniform sampler2D uTileDataTexture;

varying vec3 vColor;
varying vec4 vGrassData;
varying vec3 vNormal;
varying vec3 vWorldPosition;

vec2 quickHash(float p) {
    vec2 r = vec2(
        dot(vec2(p), vec2(17.43267, 23.8934543)),
        dot(vec2(p), vec2(13.98342, 37.2435232))
    );
    return fract(sin(r) * 1743.54892229);
}

float easeOut(float x, float t) {
    return 1.0 - pow(1.0 - x, t);
}   

vec3 hash(vec3 p) {

    p = vec3(
        dot(vec3(p), vec3(127.1, 311.7, 74.7)),
        dot(vec3(p), vec3(269.5, 183.3, 246.1)),
        dot(vec3(p), vec3(113.5, 271.9, 124.6))
    );
    return  -1.0  + 2.0 * fract(sin(p) * 43758.5453123);
}           

mat3 rotateY(float theta) {
    float c = cos(theta);
    float s = sin(theta);
    return mat3(
        vec3(c, 0.0, s),
        vec3(0.0, 1.0, 0.0),
        vec3(-s, 0.0, c)
    );
}

float inverseLerp(float value, float minValue, float maxValue) {
    return (value - minValue) / (maxValue - minValue);
}

float remap(float value, float inMin, float inMax, float outMin, float outMax) {
    float t = inverseLerp(value, inMin, inMax);
    return mix(outMin, outMax, t);  
}      

float saturate(float value) {
    return clamp(value, 0.0, 1.0);
}   

vec3 bezier(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
  return (1.0 - t) * (1.0 - t) * (1.0 - t) * P0 +
         3.0 * (1.0 - t) * (1.0 - t) * t * P1 +
         3.0 * (1.0 - t) * t * t * P2 +
         t * t * t * P3;
}

vec3 bezierGrad(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
  return 3.0 * (1.0 - t) * (1.0 - t) * (P1 - P0) +
         6.0 * (1.0 - t) * t * (P2 - P1) +
         3.0 * t * t * (P3 - P2);
}

uvec2 murmurHash21(uint src) {
  const uint M = 0x5bd1e995u;
  uvec2 h = uvec2(1190494759u, 2147483647u);
  src *= M;
  src ^= src>>24u;
  src *= M;
  h *= M;
  h ^= src;
  h ^= h>>13u;
  h *= M;
  h ^= h>>15u;
  return h;
}

// 2 outputs, 1 input
vec2 hash21(float src) {
  uvec2 h = murmurHash21(floatBitsToUint(src));
  return uintBitsToFloat(h & 0x007fffffu | 0x3f800000u) - 1.0;
}

float noise( in vec3 p )
{
  vec3 i = floor( p );
  vec3 f = fract( p );
	
	vec3 u = f*f*(3.0-2.0*f);

  return mix( mix( mix( dot( hash( i + vec3(0.0,0.0,0.0) ), f - vec3(0.0,0.0,0.0) ), 
                        dot( hash( i + vec3(1.0,0.0,0.0) ), f - vec3(1.0,0.0,0.0) ), u.x),
                   mix( dot( hash( i + vec3(0.0,1.0,0.0) ), f - vec3(0.0,1.0,0.0) ), 
                        dot( hash( i + vec3(1.0,1.0,0.0) ), f - vec3(1.0,1.0,0.0) ), u.x), u.y),
              mix( mix( dot( hash( i + vec3(0.0,0.0,1.0) ), f - vec3(0.0,0.0,1.0) ), 
                        dot( hash( i + vec3(1.0,0.0,1.0) ), f - vec3(1.0,0.0,1.0) ), u.x),
                   mix( dot( hash( i + vec3(0.0,1.0,1.0) ), f - vec3(0.0,1.0,1.0) ), 
                        dot( hash( i + vec3(1.0,1.0,1.0) ), f - vec3(1.0,1.0,1.0) ), u.x), u.y), u.z );
}


mat3 rotateAxis(vec3 axis, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(  
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}
    
const vec3 BASE_COLOR = vec3(0.1, 0.4, 0.04);
const vec3 TIP_COLOR = vec3(0.5, 0.7, 0.3);

void main() {
    int GRASS_SEGMENTS = int(uGrassParams.x);   
    int GRASS_VERTICES = int(GRASS_SEGMENTS + 1) * 2;
    float GRASS_PATCH_SIZE = uGrassParams.y;
    float GRASS_WIDTH = uGrassParams.z;
    float GRASS_HEIGHT = uGrassParams.w;

    // Figure out grass offset  
  vec2 hashedInstanceID = hash21(float(gl_InstanceID)) * 2.0 - 1.0;
    vec3 grassOffset = vec3(hashedInstanceID.x, 0.0, hashedInstanceID.y) * GRASS_PATCH_SIZE;

    vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz;
    vec3 hashVal = hash(grassBladeWorldPos);

    // Grass rotation
    float angle = remap(hashVal.x, -1.0, 1.0, -PI, PI);

    vec4 tileData = texture2D(uTileDataTexture,vec2(grassBladeWorldPos.x,grassBladeWorldPos.z) / GRASS_PATCH_SIZE * 0.5 + 0.5);
    
    // Stiffness    
    float stiffness = 1.0 - tileData.x * 0.85;

    // Figure out vertex id, > GRASS_VERTICES is other side
    int vertFB_ID = gl_VertexID % (GRASS_VERTICES * 2);
    int vertID = vertFB_ID % GRASS_VERTICES;

    // 0 - left, 1 - right
    int xTest = vertID & 0x1;
    int zTest = (vertFB_ID >= GRASS_VERTICES) ? 1 : -1;
    float xSide = float(xTest);
    float zSide = float(zTest);
    float heightPercent = float(vertID - xTest) / (float(GRASS_SEGMENTS) * 2.0);
    
    float width = GRASS_WIDTH * easeOut(1.0 - heightPercent, 4.0);
    // float width = GRASS_WIDTH * smoothstep(0.0, 0.25, 1.0 - heightPercent);
    float height = GRASS_HEIGHT;        

    // Calculate the vertex position
    float x = (xSide - 0.5) * width;
    float y = heightPercent * height;
    float z = 0.0;

    // Grass lean factor
    float windStrength = noise(vec3(grassBladeWorldPos.xz * 0.05, 0.0) + uTime);
    float windAngle = 0.0;
    vec3 windAxis = vec3(cos(windAngle), 0.0, sin(windAngle));
    float windLeanAngle = windStrength * 1.5 * heightPercent * stiffness;

    float randomLeanAnimation = noise(
      vec3(grassBladeWorldPos.xz, uTime * 4.0)) * (windStrength * 0.5 + 0.125);

    float leanFactor = remap(hashVal.y, -1.0, 1.0, -0.5, 0.5) + randomLeanAnimation;

    // Add the bezier curve for bend
    vec3 p1 = vec3(0.0);
    vec3 p2 = vec3(0.0, 0.33, 0.0);
    vec3 p3 = vec3(0.0, 0.66, 0.0); 
    vec3 p4 = vec3(0.0, cos(leanFactor), sin(leanFactor));
    vec3 curve = bezier(p1, p2, p3, p4, heightPercent);

    // Calculate normal 
    vec3 curveGrad = bezierGrad(p1, p2, p3, p4, heightPercent);
    mat2 curveRot90 = mat2(0.0, -1.0, 1.0, 0.0) * -zSide;

    y = curve.y * height;
    z = curve.z * height;

    // Generate grass matrix
  mat3 grassMat = rotateAxis(windAxis, windLeanAngle) * rotateY(angle);

    vec3 grassLocalPosition = grassMat * vec3(x , y, z ) + grassOffset;
    vec3 grassLocalNormal = grassMat * vec3(0.0, curveRot90 * curveGrad.yz);

      // Blend normal
  float distanceBlend = smoothstep(
      0.0, 10.0, distance(cameraPosition, grassBladeWorldPos));
  grassLocalNormal = mix(grassLocalNormal, vec3(0.0, 1.0, 0.0), distanceBlend * 0.75);
  grassLocalNormal = normalize(grassLocalNormal);

  // Viewspace thicken
  vec4 mvPosition = modelViewMatrix * vec4(grassLocalPosition, 1.0);

  vec3 viewDir = normalize(cameraPosition - grassBladeWorldPos);
  vec3 grassFaceNormal = (grassMat * vec3(0.0, 0.0, -zSide));

  float viewDotNormal = saturate(dot(grassFaceNormal, viewDir));
  float viewSpaceThickenFactor = easeOut(
      1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * width * 0.5 * -zSide;

  gl_Position = projectionMatrix * mvPosition;      
 

    // Varyings
    // vColor = mix(BASE_COLOR, TIP_COLOR, heightPercent);

    // float noiseValue = texture(uPerlinNoiseTexture, (grassBladeWorldPos.xz) * 0.1).r;   
    
    // vec3 c1 = mix(BASE_COLOR, TIP_COLOR, heightPercent);
    // vec3 c2 = mix(vec3(0.0, 0.0, 0.0), vec3(1.0, 1.0, 0.25), heightPercent);
    // vColor = mix(c1, c2, smoothstep(-1.0, 1.0, noiseValue));
    // vColor = grassLocalNormal;

    vColor = mix(BASE_COLOR, TIP_COLOR, heightPercent);
    vColor = mix(vec3(1.0, 0.0, 0.0), vColor,stiffness);

    vGrassData = vec4(x, heightPercent, xSide, 0.0);
        vNormal = normalize((modelMatrix * vec4(grassLocalNormal, 0.0)).xyz);
  vWorldPosition = (modelMatrix * vec4(grassLocalPosition, 1.0)).xyz;

}   
