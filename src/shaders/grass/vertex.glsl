uniform vec4 uGrassParameters;
// Patch shading: a single bottom (root) -> top (tip) color gradient and two
// patch variants (~half the field each, picked by noise at the blade root).
// Each variant scales the whole gradient by its own lighting factor, so a
// patch darkens or lightens the root and tip colors evenly.
uniform vec3 uColorBottom;
uniform vec3 uColorTop;
uniform float uLighting1; // gradient lighting of patch variant 1 (1 = base colors)
uniform float uLighting2; // gradient lighting of patch variant 2
uniform float uColorNoiseScale;
uniform float uColorSharpness; // 0 = wide soft blends between patches, 1 = hard edges
// Voronoi patches: procedural cells where each cell picks one flat palette
// color from a per-cell random id (uniform id -> ~a third of the cells per
// color); a perlin warp bends their borders organic
uniform float uVoronoiMix; // 0 = pure perlin patches, 1 = pure voronoi cells
uniform float uVoronoiScale; // cells per world unit (higher = smaller cells)
uniform float uVoronoiWarpStrength; // how far the perlin pushes the cell borders (cell units)
uniform float uVoronoiWarpScale; // scale of the warping perlin
uniform float uTime;
uniform sampler2D uHeightDataTexture;
uniform sampler2D uPerlinNoiseTexture;
uniform bool uSquareShape;
uniform float uPositionX;
uniform float uPositionZ;
uniform sampler2D uTrampleTexture;
uniform float uTrampleStrength;

uniform float uWindScale;
uniform float uWindStrength;
uniform float uWindSpeed;

uniform float uFlowerAmount;
uniform float uFlowerHeight;
uniform float uFlowerWidth;
// Base pinch: fraction of the full width separating the two bottom vertices
uniform float uFlowerBaseWidth;

uniform float uRepulseStrength; // max tilt angle in radians (PI/2 = flat on the ground)
uniform float uRepulseSquash; // extra height shortening at full influence (0-1)

// Distance thinning, world units from the camera: full density up to .x,
// none past .y (blades shrink out over a per-blade band instead of popping)
uniform vec2 uThinDistance;
// cos of the view-cone half angle: blade roots further off the camera axis
// than this collapse before any texture fetch
uniform float uCullCos;

// Fake rounded cross-section: tilt of the shading normal toward the blade
// edges (0 = flat strip, 1 = 45 degrees at the edges)
uniform float uNormalRounding;

// Blade root in patch space ([-1, 1] on x/z). Placed on the CPU only where the
// height mask has grass and sorted spatially (grassPlacement.js), so the
// culls below agree across neighbouring instances.
attribute vec2 aBladePosition;

// CSM composes this shader with three's chunks: `saturate` and `PI` come
// from <common> (do not redefine), and the varyings are prefixed to avoid
// colliding with the standard material's vUv/vColor/vWorldPosition
// centroid: the blades are thin triangles; with MSAA the pixel center can
// fall outside them and extrapolate the varyings past their vertex range
centroid varying vec3 vGrassColor;
centroid varying vec2 vGrassUv;
centroid varying vec3 vGrassWorldPos;
// Smooth shading, view space: normal following the bezier bend, and the
// edge tilt of the fake rounding (the fragment shader flips only the first
// on back faces)
centroid varying vec3 vGrassBendNormal;
centroid varying vec3 vGrassSideTilt;

// inverseLerp and remap are for remapping values
float inverseLerp(float v, float minValue, float maxValue) {
  return (v - minValue) / (maxValue - minValue);
}
float remap(float v, float inMin, float inMax, float outMin, float outMax) {
  float t = inverseLerp(v, inMin, inMax);
  return mix(outMin, outMax, t);
}

float easeOut(float x, float t) {
  return 1.0 - pow(1.0 - x, t);
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

// Voronoi cell ids: nearest + second-nearest feature point in a 3x3 grid
// neighbourhood. Returns (id1, id2, edge) — per-cell random ids in [0, 1]
// and the border distance F2 - F1 (0 exactly on a cell border).
vec3 voronoiCells(vec2 p) {
  vec2 ip = floor(p);
  vec2 fp = fract(p);
  float f1 = 8.0, f2 = 8.0;
  float id1 = 0.0, id2 = 0.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y));
      vec3 h = hash(vec3(ip + g, 0.0)); // -1..1
      vec2 offset = g + 0.5 + 0.5 * h.xy; // feature point in that cell
      vec2 d = fp - offset;
      float dist = dot(d, d);
      if (dist < f1) {
        f2 = f1;
        id2 = id1;
        f1 = dist;
        id1 = h.z * 0.5 + 0.5;
      } else if (dist < f2) {
        f2 = dist;
        id2 = h.z * 0.5 + 0.5;
      }
    }
  }
  return vec3(id1, id2, sqrt(f2) - sqrt(f1));
}

// Bezier curve function for bending the grass blade
vec3 bezier(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
  return (1.0 - t) * (1.0 - t) * (1.0 - t) * P0 +
  3.0 * (1.0 - t) * (1.0 - t) * t * P1 +
  3.0 * (1.0 - t) * t * t * P2 +
  t * t * t * P3;
}

// Derivative of the curve above: the blade tangent at t
vec3 bezierTangent(vec3 P0, vec3 P1, vec3 P2, vec3 P3, float t) {
  float u = 1.0 - t;
  return 3.0 * u * u * (P1 - P0) + 6.0 * u * t * (P2 - P1) + 3.0 * t * t * (P3 - P2);
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

// Zero-area blade: all its vertices at the origin rasterize nothing
void collapse() {
  csm_Position = vec3(0.0);
  vGrassColor = vec3(0.0);
  vGrassUv = vec2(0.0);
  vGrassBendNormal = vec3(0.0, 0.0, 1.0);
  vGrassSideTilt = vec3(0.0);
}

void main() {
  int GRASS_SEGMENTS = int(uGrassParameters.x);
  int GRASS_VERTICES = (GRASS_SEGMENTS + 1) * 2;
  float GRASS_PATCH_SIZE = uGrassParameters.y;
  float GRASS_WIDTH = uGrassParameters.z;
  float GRASS_HEIGHT = uGrassParameters.w;

  // Blade root: CPU placement in patch space scaled to the patch
  vec3 grassOffset =
    vec3(aBladePosition.x, 0.0, aBladePosition.y) * GRASS_PATCH_SIZE;

  vec3 grassBladeWorldPos = (modelMatrix * vec4(grassOffset, 1.0)).xyz; // get the world position of the grass blade
  vGrassWorldPos = grassBladeWorldPos; // for cloud shadows (per blade is enough)

  // --- Early culls, before any texture fetch or hashing. Collapsed blades
  // cost only the lines above; with the instances sorted spatially, whole
  // warps take the same branch.
  vec3 toBlade = grassBladeWorldPos - cameraPosition;
  float bladeDistance = length(toBlade);
  // Third row of the view matrix is the camera's +z (backwards) in world space
  vec3 cameraForward = -vec3(viewMatrix[0].z, viewMatrix[1].z, viewMatrix[2].z);
  // Distance thinning: density falls from 1 at uThinDistance.x to 0 at .y;
  // each blade compares it against its own threshold and shrinks over a
  // 0.1-wide band so the transition never pops
  float keep = 1.0 - smoothstep(uThinDistance.x, uThinDistance.y, bladeDistance);
  float thinScale = saturate((keep - rand(float(gl_InstanceID) + 2000.0)) / 0.1);
  // View cone: the root is what's tested, the angle margin covers the blade
  if (dot(toBlade, cameraForward) < uCullCos * bladeDistance || thinScale <= 0.0) {
    collapse();
    return;
  }

  // Height data texture (patchUv also samples the trample map below)
  vec2 patchUv =
    vec2(-grassBladeWorldPos.x + uPositionX, grassBladeWorldPos.z - uPositionZ) /
      GRASS_PATCH_SIZE * 0.5 +
    0.5;
  // Green channel of the packed spiral/grass/star texture; the packed file
  // uploads with the default flipY (the old standalone map used flipY=false),
  // so v is flipped here
  vec4 heightData = texture2D(uHeightDataTexture, vec2(patchUv.x, 1.0 - patchUv.y));
  float grassHeight = heightData.g;

  // Outside the grass area (only the mask edges get here now that placement
  // follows the same map): collapse before the wind fetches
  if (grassHeight < 0.25) {
    collapse();
    return;
  }

  // Generate hash for lean value for the grass blade
  vec3 hashVal = hash(grassBladeWorldPos); // generate hash value from the world position

  // Vertex id along the strip: even - left, odd - right, pairs stack up the
  // blade. One side only; the material is DoubleSide.
  int vertID = gl_VertexID % GRASS_VERTICES;
  int xTest = vertID & 0x1;
  float xSide = float(xTest);
  float heightPercent = float(vertID - xTest) / (float(GRASS_SEGMENTS) * 2.0);

  // Rnadom height
  float randomHeight = (rand(float(gl_InstanceID + 1000)) * 2.0 - 1.0) * 0.1;

  // Random squared "flower" blades with a colored tip
  bool randomFlowers = rand(float(gl_InstanceID + 1000)) > 1.0 - uFlowerAmount;

  float width;
  if (randomFlowers) {
    // Pinched base widening linearly to the full width at the tip
    width = uFlowerWidth * grassHeight
      * mix(uFlowerBaseWidth, 1.0, heightPercent);
  } else if (uSquareShape) {
    width = GRASS_WIDTH + 0.1;
  } else {
    width = GRASS_WIDTH * easeOut(1.06 - heightPercent, 3.0) * grassHeight;
  }

  // Flowers grow around their own average height; grassHeight and
  // randomHeight keep each one a different size
  float height = randomFlowers
    ? uFlowerHeight * grassHeight + randomHeight
    : GRASS_HEIGHT * grassHeight + randomHeight;

  // Distance thinning shrinks the blade into the ground
  height *= thinScale;

  // Calculate the vertex position
  float x = (xSide - 0.5) * width;
  float y = heightPercent * height;
  float z = 0.0;

  // Grass wind parameters
  float windStrength = texture2D(uPerlinNoiseTexture,
    vec2(
      vec3(-grassBladeWorldPos.x * uWindScale, grassBladeWorldPos.z * uWindScale, 0.0) + uTime * uWindSpeed
    )).g; // perlin = green channel of the packed voronoi/perlin texture

  float windAngle = 0.0;
  vec3 windAxis = vec3(cos(windAngle), 0.0, sin(windAngle));
  float windLeanAngle = windStrength * uWindStrength * heightPercent;
  float randomLeanAnimation =
    texture2D(uPerlinNoiseTexture,
        vec2(
            vec3(-grassBladeWorldPos.x * uWindScale * 1.3, grassBladeWorldPos.z * uWindScale * 1.3, 0.0) + uTime * uWindSpeed * 1.3
        )
    ).g * (windStrength * 0.5 + 0.125);

  // Grass lean factor
  float leanFactor =
    remap(hashVal.y, -1.0, 1.0, -0.3, 0.3) + randomLeanAnimation;

  float angle = remap(hashVal.x, -1.0, 1.0, -PI / 4.0, PI / 4.0); // randomize blades initial rotation

  // Trample field (Grass.jsx): each texel holds a world-space xz push vector,
  // the direction the blades lean with its length as the strength, pressed by
  // the character and spring-damped back to rest on the CPU. Byte 128 = 0.
  // USE_TRAMPLE is left out on mobile: no vertex fetch, the crush block
  // below compiles away entirely.
  #ifdef USE_TRAMPLE
  vec2 trample = (texture2D(uTrampleTexture, patchUv).rg * 255.0 - 128.0) / 127.0;
  float repulseInfluence = min(length(trample), 1.0) * uTrampleStrength;
  #else
  vec2 trample = vec2(0.0);
  float repulseInfluence = 0.0;
  #endif

  vec3 crushAxis = vec3(1.0, 0.0, 0.0);
  if (repulseInfluence > 0.001) {
    vec3 pushDir = normalize(vec3(trample.x, 0.0, trample.y));

    // rotateAxis() rotates clockwise around the axis, so cross(pushDir, up)
    // tilts the blade along the push
    crushAxis = normalize(cross(pushDir, vec3(0.0, 1.0, 0.0)));

    height *= 1.0 - repulseInfluence * uRepulseSquash; // crushed blades also compress a bit
  }

  // Bend the grass blade
  vec3 p1 = vec3(0.0);
  vec3 p2 = vec3(0.0, 0.33, 0.0);
  vec3 p3 = vec3(0.0, 0.66, 0.0);
  vec3 p4 = vec3(0.0, cos(leanFactor), sin(leanFactor));
  vec3 curve = bezier(p1, p2, p3, p4, heightPercent);
  // Shading normal following the bend (perpendicular to the tangent in the
  // blade plane): smooth shading along the curve instead of one flat normal
  // per blade. Straight up -> (0, 0, 1), the front face.
  vec3 tangent = bezierTangent(p1, p2, p3, p4, heightPercent);
  vec3 bendNormal = normalize(vec3(0.0, -tangent.z, tangent.y));

  y = curve.y * height; // change Y coord with curve
  z = curve.z * height; // change Z coord with curve

  // Generate grass matrix for rotation
  mat3 grassMat = rotateAxis(windAxis, windLeanAngle) * rotateY(angle);

  // Crush the whole (already bent) blade away from the player
  if (repulseInfluence > 0.001) {
    grassMat = rotateAxis(crushAxis, repulseInfluence * uRepulseStrength) * grassMat;
  }

  // Calculate the final position
  vec3 grassLocalPosition = grassMat * vec3(x, y, z) + grassOffset; // change initial XYZ coords with offset and rotation matrix

  // Viewspace thicken. The strip's front face (CCW winding) points +z; seen
  // from behind, `facing` flips sign so the widening still goes outwards in
  // screen space (the old back copy did this with its own vertices)
  vec3 viewDir = normalize(cameraPosition - grassBladeWorldPos);
  vec3 grassFaceNormal = grassMat * vec3(0.0, 0.0, 1.0);

  float facing = dot(grassFaceNormal, viewDir);
  float viewDotNormal = abs(facing);
  float thickenSide = facing >= 0.0 ? 1.0 : -1.0;
  float viewSpaceThickenFactor =
    easeOut(1.0 - viewDotNormal, 4.0) * smoothstep(0.0, 0.2, viewDotNormal);

  // The thickening happens along the camera's right axis but is applied in
  // local space (CSM projects csm_Position through three's own chunks, so
  // the lighting varyings stay consistent). The mesh has no rotation or
  // scale, so world and local axes match.
  vec3 cameraRight = vec3(viewMatrix[0].x, viewMatrix[1].x, viewMatrix[2].x);
  grassLocalPosition +=
    cameraRight * (viewSpaceThickenFactor * (xSide - 0.5) * width * 0.5 * thickenSide);

  csm_Position = grassLocalPosition;

  // Smooth shading normal (bend + crush through grassMat), lit materials
  // only - MeshBasicMaterial ignores normals. The fragment shader flips the
  // bend part on back faces; the edge tilt of the fake rounding stays, so
  // both sides read as the same rounded blade
  #ifndef IS_MESHBASICMATERIAL
  vec3 shadingNormal = grassMat * bendNormal;
  vGrassBendNormal = normalize(normalMatrix * shadingNormal);
  vGrassSideTilt = normalMatrix *
    (grassMat * vec3((xSide * 2.0 - 1.0) * uNormalRounding, 0.0, 0.0));
  csm_Normal = shadingNormal;
  #endif

  // Patch variant selector at the root (flower stems included), 0 = variant
  // 1, 1 = variant 2: neighbouring blades read the same noise and group into
  // patches, ~half the field each. Perlin (free blobs, same packed texture
  // as the wind but static UVs and an independent scale) blended with
  // voronoi cells - evenly sized patches, one flat variant per cell, borders
  // perlin-warped organic. The sharpness control sets the blend band on both
  // paths; the uniform branch skips the warp fetches and the cell search
  // while the mix is off.
  vec2 colorUv = vec2(-grassBladeWorldPos.x, grassBladeWorldPos.z);
  float colorNoise = texture2D(uPerlinNoiseTexture,
    colorUv * uColorNoiseScale).g;
  float colorBlendBand = mix(0.35, 0.02, uColorSharpness);
  float variant =
    smoothstep(0.5 - colorBlendBand, 0.5 + colorBlendBand, colorNoise);
  if (uVoronoiMix > 0.0) {
    vec2 warpUv = colorUv * uVoronoiWarpScale;
    vec2 warp = vec2(
      texture2D(uPerlinNoiseTexture, warpUv).g,
      texture2D(uPerlinNoiseTexture, warpUv + vec2(0.37, 0.71)).g
    ) - 0.5;
    vec3 cells = voronoiCells(
      colorUv * uVoronoiScale + warp * uVoronoiWarpStrength);
    float band = mix(0.5, 0.03, uColorSharpness);
    float cellVariant = mix(step(0.5, cells.y), step(0.5, cells.x),
      0.5 + 0.5 * smoothstep(0.0, band, cells.z));
    variant = mix(variant, cellVariant, uVoronoiMix);
  }
  // One lighting factor per variant, darkening or lightening the root and
  // tip colors together so a patch keeps the gradient's hues
  float patchLighting = mix(uLighting1, uLighting2, variant);
  // Root -> tip gradient; heightPercent is linear along the blade, so the
  // varying interpolation matches a per-fragment mix
  vGrassColor = mix(uColorBottom, uColorTop, heightPercent) * patchLighting;

  // x: flower flag, y: height percent along the blade
  vGrassUv = vec2(randomFlowers ? 1.0 : 0.0, heightPercent);
}
