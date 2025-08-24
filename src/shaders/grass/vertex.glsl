uniform vec4 uGrassParameters;
uniform vec3 uGrassBaseColor;
uniform vec3 uGrassTopColor;
uniform float uTime;
uniform sampler2D uHeightDataTexture;
uniform sampler2D uPerlinNoiseTexture;
uniform bool uSquareShape;
uniform float uPositionX;
uniform float uPositionZ;
uniform vec3 uPlayerPosition;

uniform float uWindScale;
uniform float uWindStrength;
uniform float uWindSpeed;

varying vec3 vColor;

// inverseLerp and remap are for remapping values
float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}
float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

// Used in viewspace thickening
float saturate(float x) {
  return clamp(x, 0.0, 1.0);
}
float easeOut(float x, float t) {
  return 1.0 - pow(1.0 - x, t);
}

// hash21 and murmurHash21 are for hashing the instance ID to a vec2 for position offset
uvec2 murmurHash21(uint src) {
  const uint M = 0x5bd1e995u;
  uvec2 h = uvec2(1190494759u, 2147483647u);
  src *= M;
  src ^= src >> 24u;
  src *= M;
  h *= M;
  h ^= src;
  h ^= h >> 13u;
  h *= M;
  h ^= h >> 15u;
  return h;
}

// 1 input -> 2 output
vec2 hash21(float src) {
  uvec2 h = murmurHash21(floatBitsToUint(src));
  return uintBitsToFloat((h & 0x007fffffu) | 0x3f800000u) - 1.0;
}

// The MIT License
// Copyright © 2013 Inigo Quilez
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
// https://www.youtube.com/c/InigoQuilez
// https://iquilezles.org/
//
// https://www.shadertoy.com/view/Xsl3Dl
vec3 hash(
  vec3 p // replace this by something better
) {
  p = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );

  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

// Bezier curve function for bending the grass blade
vec3 bezier(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
  return (1.0 - t) * (1.0 - t) * (1.0 - t) * P0 +
  3.0 * (1.0 - t) * (1.0 - t) * t * P1 +
  3.0 * (1.0 - t) * t * t * P2 +
  t * t * t * P3;
}

// Rotation matrix functions
mat3 rotateY(float theta) {
  float c = cos(theta);
  float s = sin(theta);
  return mat3(vec3(c, 0, s), vec3(0, 1, 0), vec3(-s, 0, c));
}

mat3 rotateAxis(vec3 axis, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat3(
    oc * axis.x * axis.x + c,
    oc * axis.x * axis.y - axis.z * s,
    oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,
    oc * axis.y * axis.y + c,
    oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,
    oc * axis.y * axis.z + axis.x * s,
    oc * axis.z * axis.z + c
  );
}

// Random function for height
float rand(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  int GRASS_SEGMENTS = int(uGrassParameters.x);
  int GRASS_VERTICES = (GRASS_SEGMENTS + 1) * 2;
  float GRASS_PATCH_SIZE = uGrassParameters.y;
  float GRASS_WIDTH = uGrassParameters.z;
  float GRASS_HEIGHT = uGrassParameters.w;

  // Generate grass local position
  vec2 hashedInstanceID = hash21(float(gl_InstanceID)) * 2.0 - 1.0; // generate 2D coords from instance ID of the grass blade
  vec3 grassOffset =
    vec3(hashedInstanceID.x, 0.0, hashedInstanceID.y) * GRASS_PATCH_SIZE; // grass offset with patch size

  // Generate hash for lean value for the grass blade
  vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz; // get the world position of the grass blade
  vec3 hashVal = hash(grassBladeWorldPos); // generate hash value from the world position

  // Height data texture
  vec4 heightData = texture2D(
    uHeightDataTexture,
    vec2(-grassBladeWorldPos.x + uPositionX, grassBladeWorldPos.z - uPositionZ) / GRASS_PATCH_SIZE * 0.5 +
      0.5
  );
  float grassHeight = heightData.x;


  // Figure out vertex id, > GRASS_VERTICES is other side
  int vertFB_ID = gl_VertexID % (GRASS_VERTICES * 2);
  int vertID = vertFB_ID % GRASS_VERTICES; // even - left, odd - right

  // 0 = left, 1 = right
  int xTest = vertID & 0x1;
  int zTest = vertFB_ID >= GRASS_VERTICES ? 1 : -1;
  float xSide = float(xTest);
  float zSide = float(zTest);
  float heightPercent = float(vertID - xTest) / (float(GRASS_SEGMENTS) * 2.0);


    // Random height
  float randomHeight = (rand(float(gl_InstanceID + 1000)) * 2.0 - 1.0) * 0.1;
  
  // Add player-based height reduction
  vec3 toPlayer = uPlayerPosition - grassBladeWorldPos;
  float distanceToPlayer = length(toPlayer);
  float maxInfluenceDistance = 0.5; // Distance for height influence
  float heightInfluence = smoothstep(maxInfluenceDistance, 0.0, distanceToPlayer);
  float heightReduction = heightInfluence * 0.5; // Reduce height by up to 70%
  
  float width = uSquareShape
    ? GRASS_WIDTH
    : GRASS_WIDTH * easeOut(1.04 - heightPercent, 3.0) * grassHeight;
  float height = (GRASS_HEIGHT * grassHeight + randomHeight) * (1.0 - heightReduction);

  // Calculate the vertex position
  float x = (xSide - 0.5) * width;
  float y = heightPercent * height;
  float z = 0.0;


  // Grass wind parameters
float windStrength = texture2D(uPerlinNoiseTexture, 
  vec2( 
    vec3(-grassBladeWorldPos.x * uWindScale, grassBladeWorldPos.z * uWindScale, 0.0) + uTime * uWindSpeed
  )).r; 
  
  float windAngle = 0.0;
  vec3 windAxis = vec3(cos(windAngle), 0.0, sin(windAngle));
  float windLeanAngle = windStrength * uWindStrength * heightPercent;
  float randomLeanAnimation = 
    texture2D(uPerlinNoiseTexture, 
        vec2(
            vec3(-grassBladeWorldPos.x * uWindScale * 1.3, grassBladeWorldPos.z * uWindScale * 1.3, 0.0) + uTime * uWindSpeed * 1.3
        )
    ).r * (windStrength * 0.5 + 0.125);
    

  // Grass lean factor
    float leanFactor =
    remap(hashVal.y, -1.0, 1.0, -0.3, 0.3) + randomLeanAnimation;

  // Add player-based lean effect
  float playerInfluence = smoothstep(maxInfluenceDistance, 0.0, distanceToPlayer);
  
  // Calculate lean direction towards player
  vec3 playerLeanDirection = normalize(vec3(toPlayer.x, 0.0, toPlayer.z));
  float playerLeanStrength = playerInfluence * 1.0; // Maximum lean strength
  
  // Apply player lean to the bezier curve endpoint
  vec3 playerLean = playerLeanDirection * playerLeanStrength;

  // Bend the grass blade
  vec3 p1 = vec3(0.0);  
  vec3 p2 = vec3(0.0, 0.33, 0.0);
  vec3 p3 = vec3(0.0, 0.66, 0.0);
  vec3 p4 = vec3(playerLean.x, cos(leanFactor), sin(leanFactor) + playerLean.z);
  vec3 curve = bezier(p1, p2, p3, p4, heightPercent);


  y = curve.y * height; // change Y coord with curve
  z = curve.z * height; // change Z coord with curve

  // Generate grass matrix for rotation
  const float PI = 3.14159;
  float angle = remap(hashVal.x, -1.0, 1.0, -PI / 4.0, PI / 4.0); // randomize blades initial rotation
  mat3 grassMat = rotateAxis(windAxis, windLeanAngle) * rotateY(angle);

  // Calculate the final position
  vec3 grassLocalPosition = grassMat * vec3(x, y, z) + grassOffset; // change initial XYZ coords with offset and rotation matrix

  // Viewspace thicken
  vec4 mvPosition = modelViewMatrix * vec4(grassLocalPosition, 1.0);

  vec3 viewDir = normalize(cameraPosition - grassBladeWorldPos);
  vec3 grassFaceNormal = grassMat * vec3(0.0, 0.0, -zSide);

  float viewDotNormal = saturate(dot(grassFaceNormal, viewDir));
  float viewSpaceThickenFactor =
    easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

  mvPosition.x += viewSpaceThickenFactor * (xSide - 0.5) * width * 0.5 * -zSide;

  gl_Position = projectionMatrix * mvPosition;
  
  if (grassHeight < 0.25) {
        gl_Position = vec4(0.0, 0.0, 0.0, 0.0); // Position hors écran ou invalide
        vColor = vec3(0.0); 
        return;
    }

  // Pass the color to the fragment shader
  vColor = mix(uGrassBaseColor, uGrassTopColor, heightPercent);
  // vColor = vec3(windStrength);
}
