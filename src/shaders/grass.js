import * as THREE from 'three/webgpu';
import {
  Fn,
  If,
  abs,
  cameraPosition,
  cameraViewMatrix,
  clamp,
  cos,
  cross,
  dot,
  faceDirection,
  float,
  floor,
  fract,
  instanceIndex,
  length,
  mat3,
  max,
  min,
  mix,
  mod,
  modelWorldMatrix,
  normalize,
  saturate,
  select,
  sin,
  smoothstep,
  sqrt,
  step,
  texture,
  time,
  uniform,
  varyingProperty,
  vec2,
  vec3,
  vec4,
  vertexIndex,
  attribute,
} from 'three/tsl';

import { cloudShadowFactor } from '#shaders/cloudShadows.js';

// Blades are built in the vertex stage from the vertex and instance ids;
// aBladePosition is the CPU-placed root in patch space ([-1, 1] on x/z, see
// grassPlacement.js).
//
// MSAA: the blades are thin triangles, MSAA extrapolates varyings past their
// vertex range and TSL has no centroid sampling. The per-vertex values that
// matter are made safe instead: the root->tip gradient is rebuilt in the
// fragment stage from a clamped height percent, the patch lighting is
// constant per blade (extrapolating a constant changes nothing), and the
// normals are renormalized with a floor.

/**
 * Uniform nodes driven by the Grass.jsx controls.
 */
const createGrassUniforms = ({
  heightTexture,
  perlinTexture,
  trampleTexture,
}) => ({
  // Strip segments per blade (loop cuts + 1)
  uSegments: uniform(1),
  // Half extent of the square patch, world units
  uPatchSize: uniform(11.7),
  uBladeWidth: uniform(0.129),
  uBladeHeight: uniform(0.491),
  uColorBottom: uniform(new THREE.Color()),
  uColorTop: uniform(new THREE.Color()),
  // Gradient lighting of each patch variant (1 = base colors)
  uLighting1: uniform(1),
  uLighting2: uniform(1),
  uColorNoiseScale: uniform(0),
  // 0 = wide soft blends between patches, 1 = hard edges
  uColorSharpness: uniform(0),
  // 0 = pure perlin patches, 1 = pure voronoi cells
  uVoronoiMix: uniform(0),
  // cells per world unit (higher = smaller cells)
  uVoronoiScale: uniform(1),
  // how far the perlin pushes the cell borders (cell units)
  uVoronoiWarpStrength: uniform(0),
  uVoronoiWarpScale: uniform(0),
  // 0/1
  uSquareShape: uniform(0),
  uPositionX: uniform(0),
  uPositionZ: uniform(0),

  uRedTipColor: uniform(new THREE.Color()),
  // portion of the blade covered by the red tip (0-1)
  uRedTipLength: uniform(0),
  uFlowerAmount: uniform(0),
  uFlowerHeight: uniform(0),
  uFlowerWidth: uniform(0),
  // Base pinch: fraction of the full width separating the two bottom vertices
  uFlowerBaseWidth: uniform(1),

  uHeightDataTexture: texture(heightTexture),
  uPerlinNoiseTexture: texture(perlinTexture),
  uTrampleTexture: texture(trampleTexture),

  uWindScale: uniform(0),
  uWindStrength: uniform(0),
  uWindSpeed: uniform(0),

  // Distance thinning, world units from the camera: full density up to .x,
  // none past .y
  uThinDistance: uniform(new THREE.Vector2(1e6, 1e6)),
  // cos of the view-cone half angle
  uCullCos: uniform(-1),
  // Fake rounded cross-section (0 = flat strip, 1 = 45 degrees at the edges)
  uNormalRounding: uniform(0),
  // Blend of the shading normal toward world up
  uNormalUp: uniform(0),

  // max tilt angle in radians (PI/2 = flat on the ground)
  uRepulseStrength: uniform(0),
  // extra height shortening at full influence (0-1)
  uRepulseSquash: uniform(0),
  uTrampleStrength: uniform(0),
});

// Hash and voronoi: The MIT License, Copyright © 2013 Inigo Quilez
// https://www.shadertoy.com/view/Xsl3Dl
const hash = p => {
  const h = vec3(
    dot(p, vec3(127.1, 311.7, 74.7)),
    dot(p, vec3(269.5, 183.3, 246.1)),
    dot(p, vec3(113.5, 271.9, 124.6))
  );
  return fract(sin(h).mul(43758.5453123)).mul(2).sub(1);
};

// Voronoi cell ids: nearest + second-nearest feature point in a 3x3 grid
// neighbourhood. Returns (id1, id2, edge) — per-cell random ids in [0, 1]
// and the border distance F2 - F1 (0 exactly on a cell border).
const voronoiCells = Fn(([p]) => {
  const ip = floor(p).toVar();
  const fp = fract(p).toVar();
  const f1 = float(8).toVar();
  const f2 = float(8).toVar();
  const id1 = float(0).toVar();
  const id2 = float(0).toVar();

  for (let y = -1; y <= 1; y++) {
    for (let x = -1; x <= 1; x++) {
      const g = vec2(x, y);
      const h = hash(vec3(ip.add(g), 0)).toVar();
      const offset = g.add(0.5).add(h.xy.mul(0.5)); // feature point in that cell
      const d = fp.sub(offset);
      const dist = dot(d, d).toVar();
      If(dist.lessThan(f1), () => {
        f2.assign(f1);
        id2.assign(id1);
        f1.assign(dist);
        id1.assign(h.z.mul(0.5).add(0.5));
      }).ElseIf(dist.lessThan(f2), () => {
        f2.assign(dist);
        id2.assign(h.z.mul(0.5).add(0.5));
      });
    }
  }

  return vec3(id1, id2, sqrt(f2).sub(sqrt(f1)));
}).setLayout({
  name: 'grassVoronoiCells',
  type: 'vec3',
  inputs: [{ name: 'p', type: 'vec2' }],
});

const rand = n => fract(sin(n).mul(43758.5453123));
// t is a whole number: the power is unrolled into multiplies. pow() of a
// negative base is NaN in WGSL, and the blade width calls this with
// 1 - x < 0 at the root (x = 1.06 - heightPercent), where it must stay a real
// (slightly negative) cube
const easeOut = (x, t) => {
  const base = float(1).sub(x).toVar();
  let power = base;
  for (let i = 1; i < t; i++) power = power.mul(base);
  return float(1).sub(power);
};
const remap = (v, inMin, inMax, outMin, outMax) =>
  mix(outMin, outMax, v.sub(inMin).div(inMax - inMin));

// Bezier curve bending the blade, and its derivative (the blade tangent)
const bezier = (P0, P1, P2, P3, t) => {
  const u = float(1).sub(t);
  return P0.mul(u.mul(u).mul(u))
    .add(P1.mul(u.mul(u).mul(t).mul(3)))
    .add(P2.mul(u.mul(t).mul(t).mul(3)))
    .add(P3.mul(t.mul(t).mul(t)));
};
const bezierTangent = (P0, P1, P2, P3, t) => {
  const u = float(1).sub(t);
  return P1.sub(P0)
    .mul(u.mul(u).mul(3))
    .add(P2.sub(P1).mul(u.mul(t).mul(6)))
    .add(P3.sub(P2).mul(t.mul(t).mul(3)));
};

// Same column-major layout as the GLSL mat3 constructors
const rotateY = theta => {
  const c = cos(theta);
  const s = sin(theta);
  return mat3(vec3(c, 0, s), vec3(0, 1, 0), vec3(s.negate(), 0, c));
};
const rotateAxis = (axis, angle) => {
  const s = sin(angle);
  const c = cos(angle);
  const oc = float(1).sub(c);
  return mat3(
    oc.mul(axis.x).mul(axis.x).add(c),
    oc.mul(axis.x).mul(axis.y).sub(axis.z.mul(s)),
    oc.mul(axis.z).mul(axis.x).add(axis.y.mul(s)),
    oc.mul(axis.x).mul(axis.y).add(axis.z.mul(s)),
    oc.mul(axis.y).mul(axis.y).add(c),
    oc.mul(axis.y).mul(axis.z).sub(axis.x.mul(s)),
    oc.mul(axis.z).mul(axis.x).sub(axis.y.mul(s)),
    oc.mul(axis.y).mul(axis.z).add(axis.x.mul(s)),
    oc.mul(axis.z).mul(axis.z).add(c)
  );
};

// World direction -> view space (the mesh has no rotation or scale)
const toView = n => cameraViewMatrix.mul(vec4(n, 0)).xyz;

// Early culls, before any texture fetch or hashing. With the instances
// sorted spatially, whole warps take the same branch. Returns the distance
// thinning scale (0 = gone) and whether the blade survives the view cone
const cullBlade = (u, bladeWorldPos, instance) => {
  const toBlade = bladeWorldPos.sub(cameraPosition).toVar();
  const bladeDistance = length(toBlade).toVar();
  // Third row of the view matrix is the camera's +z (backwards) in world
  const cameraForward = vec3(
    cameraViewMatrix.element(0).z,
    cameraViewMatrix.element(1).z,
    cameraViewMatrix.element(2).z
  ).negate();
  // Distance thinning: density falls from 1 at uThinDistance.x to 0 at .y;
  // each blade compares it against its own threshold and shrinks over a
  // 0.1-wide band so the transition never pops
  const keep = float(1).sub(
    smoothstep(u.uThinDistance.x, u.uThinDistance.y, bladeDistance)
  );
  const thinScale = saturate(
    keep.sub(rand(instance.add(2000))).div(0.1)
  ).toVar();
  // View cone: the root is what's tested, the angle margin covers the blade
  const inView = dot(toBlade, cameraForward)
    .greaterThanEqual(u.uCullCos.mul(bladeDistance))
    .and(thinScale.greaterThan(0));
  return { thinScale, inView };
};

// Patch variant selector at the blade root, 0 = variant 1, 1 = variant 2:
// perlin blobs blended with perlin-warped voronoi cells. The uniform branch
// skips the warp fetches and the cell search while the mix is off
const patchVariant = (u, bladeWorldPos) => {
  const colorUv = vec2(bladeWorldPos.x.negate(), bladeWorldPos.z);
  const colorNoise = u.uPerlinNoiseTexture.sample(
    colorUv.mul(u.uColorNoiseScale)
  ).g;
  const colorBlendBand = mix(0.35, 0.02, u.uColorSharpness);
  const variant = smoothstep(
    float(0.5).sub(colorBlendBand),
    float(0.5).add(colorBlendBand),
    colorNoise
  ).toVar();
  If(u.uVoronoiMix.greaterThan(0), () => {
    const warpUv = colorUv.mul(u.uVoronoiWarpScale).toVar();
    const warp = vec2(
      u.uPerlinNoiseTexture.sample(warpUv).g,
      u.uPerlinNoiseTexture.sample(warpUv.add(vec2(0.37, 0.71))).g
    ).sub(0.5);
    const cells = voronoiCells(
      colorUv.mul(u.uVoronoiScale).add(warp.mul(u.uVoronoiWarpStrength))
    ).toVar();
    const band = mix(0.5, 0.03, u.uColorSharpness);
    const cellVariant = mix(
      step(0.5, cells.y),
      step(0.5, cells.x),
      smoothstep(0, band, cells.z).mul(0.5).add(0.5)
    );
    variant.assign(mix(variant, cellVariant, u.uVoronoiMix));
  });
  return variant;
};

/**
 * Builds the grass node material. `lit`: MeshStandardNodeMaterial with the
 * smooth bend normal and the red tip through the emissive slot; otherwise an
 * unlit MeshBasicNodeMaterial. `trample`: sample the trample field (off on
 * mobile, where the whole pipeline is skipped).
 */
const createGrassMaterial = ({ uniforms: u, lit, trample }) => {
  const material = lit
    ? new THREE.MeshStandardNodeMaterial({ roughness: 1, metalness: 0 })
    : new THREE.MeshBasicNodeMaterial();
  // Single-sided strips seen from both sides
  material.side = THREE.DoubleSide;

  // Vertex -> fragment
  const vGrassWorldPos = varyingProperty('vec3', 'vGrassWorldPos');
  // x: flower flag, y: height percent along the blade
  const vGrassUv = varyingProperty('vec2', 'vGrassUv');
  const vPatchLighting = varyingProperty('float', 'vPatchLighting');
  // Smooth shading, view space: normal following the bezier bend, and the
  // edge tilt of the fake rounding (only the first flips on back faces)
  const vBendNormal = varyingProperty('vec3', 'vGrassBendNormal');
  const vSideTilt = varyingProperty('vec3', 'vGrassSideTilt');

  const bladePosition = attribute('aBladePosition', 'vec2');

  material.positionNode = Fn(() => {
    const segments = u.uSegments;
    const vertices = segments.add(1).mul(2);
    const patchSize = u.uPatchSize;
    const bladeWidth = u.uBladeWidth;
    const bladeHeight = u.uBladeHeight;
    const instance = float(instanceIndex);

    // Blade root: CPU placement in patch space scaled to the patch
    const grassOffset = vec3(bladePosition.x, 0, bladePosition.y)
      .mul(patchSize)
      .toVar();
    const bladeWorldPos = modelWorldMatrix
      .mul(vec4(grassOffset, 1))
      .xyz.toVar();

    // Collapsed blade: zero area, rasterizes nothing
    const position = vec3(0).toVar();
    vGrassWorldPos.assign(bladeWorldPos); // cloud shadows: per blade is enough
    vGrassUv.assign(vec2(0));
    vPatchLighting.assign(0);
    vBendNormal.assign(vec3(0, 0, 1));
    vSideTilt.assign(vec3(0));

    const { thinScale, inView } = cullBlade(u, bladeWorldPos, instance);

    If(inView, () => {
      // Height data (patchUv also samples the trample map). Green channel
      // of the packed spiral/grass/star texture, v flipped (the old
      // standalone map used flipY = false)
      const patchUv = vec2(
        bladeWorldPos.x.negate().add(u.uPositionX),
        bladeWorldPos.z.sub(u.uPositionZ)
      )
        .div(patchSize)
        .mul(0.5)
        .add(0.5)
        .toVar();
      const grassHeight = u.uHeightDataTexture
        .sample(vec2(patchUv.x, patchUv.y.oneMinus()))
        .g.toVar();

      // Outside the grass area (only the mask edges get here now that
      // placement follows the same map): stay collapsed
      If(grassHeight.greaterThanEqual(0.25), () => {
        const hashVal = hash(bladeWorldPos).toVar();

        // Vertex id along the strip: even - left, odd - right, pairs stack
        // up the blade. One side only; the material is DoubleSide
        const vertId = mod(float(vertexIndex), vertices);
        const xSide = mod(vertId, 2).toVar();
        const heightPercent = vertId.sub(xSide).div(segments.mul(2)).toVar();

        const randomHeight = rand(instance.add(1000)).mul(2).sub(1).mul(0.1);

        // Random squared "flower" blades with a colored tip
        const isFlower = rand(instance.add(1000))
          .greaterThan(float(1).sub(u.uFlowerAmount))
          .toVar();

        const width = select(
          isFlower,
          // Pinched base widening linearly to the full width at the tip
          u.uFlowerWidth
            .mul(grassHeight)
            .mul(mix(u.uFlowerBaseWidth, 1, heightPercent)),
          select(
            u.uSquareShape.greaterThan(0.5),
            bladeWidth.add(0.1),
            bladeWidth
              .mul(easeOut(float(1.06).sub(heightPercent), 3))
              .mul(grassHeight)
          )
        ).toVar();

        // Flowers grow around their own average height; distance thinning
        // shrinks the blade into the ground
        const height = select(
          isFlower,
          u.uFlowerHeight.mul(grassHeight),
          bladeHeight.mul(grassHeight)
        )
          .add(randomHeight)
          .mul(thinScale)
          .toVar();

        const x = xSide.sub(0.5).mul(width);

        // Wind (perlin = green channel of the packed voronoi/perlin texture)
        const windTime = time.mul(u.uWindSpeed);
        const windStrength = u.uPerlinNoiseTexture
          .sample(
            vec2(
              bladeWorldPos.x.negate().mul(u.uWindScale),
              bladeWorldPos.z.mul(u.uWindScale)
            ).add(windTime)
          )
          .g.toVar();

        const windAxis = vec3(1, 0, 0);
        const windLeanAngle = windStrength
          .mul(u.uWindStrength)
          .mul(heightPercent);
        const randomLeanAnimation = u.uPerlinNoiseTexture
          .sample(
            vec2(
              bladeWorldPos.x.negate().mul(u.uWindScale).mul(1.3),
              bladeWorldPos.z.mul(u.uWindScale).mul(1.3)
            ).add(windTime.mul(1.3))
          )
          .g.mul(windStrength.mul(0.5).add(0.125));

        const leanFactor = remap(hashVal.y, -1, 1, -0.3, 0.3)
          .add(randomLeanAnimation)
          .toVar();
        // Randomize the blades initial rotation
        const angle = remap(hashVal.x, -1, 1, -Math.PI / 4, Math.PI / 4);

        // Trample field (Grass.jsx): each texel holds a world-space xz push
        // vector, the direction the blades lean with its length as the
        // strength. Byte 128 = 0.
        const trampleVec = trample
          ? u.uTrampleTexture
              .sample(patchUv)
              .rg.mul(255)
              .sub(128)
              .div(127)
              .toVar()
          : vec2(0);
        const repulseInfluence = trample
          ? min(length(trampleVec), 1).mul(u.uTrampleStrength).toVar()
          : float(0);

        const crushAxis = vec3(1, 0, 0).toVar();
        If(repulseInfluence.greaterThan(0.001), () => {
          const pushDir = normalize(vec3(trampleVec.x, 0, trampleVec.y));
          // rotateAxis() rotates clockwise around the axis, so
          // cross(pushDir, up) tilts the blade along the push
          crushAxis.assign(normalize(cross(pushDir, vec3(0, 1, 0))));
          // Crushed blades also compress a bit
          height.mulAssign(
            float(1).sub(repulseInfluence.mul(u.uRepulseSquash))
          );
        });

        // Bend the grass blade
        const p1 = vec3(0);
        const p2 = vec3(0, 0.33, 0);
        const p3 = vec3(0, 0.66, 0);
        const p4 = vec3(0, cos(leanFactor), sin(leanFactor));
        const curve = bezier(p1, p2, p3, p4, heightPercent).toVar();
        // Shading normal following the bend (perpendicular to the tangent
        // in the blade plane). Straight up -> (0, 0, 1), the front face
        const tangent = bezierTangent(p1, p2, p3, p4, heightPercent);
        const bendNormal = normalize(vec3(0, tangent.z.negate(), tangent.y));

        const y = curve.y.mul(height);
        const z = curve.z.mul(height);

        const grassMat = rotateAxis(windAxis, windLeanAngle)
          .mul(rotateY(angle))
          .toVar();
        // Crush the whole (already bent) blade away from the player
        If(repulseInfluence.greaterThan(0.001), () => {
          grassMat.assign(
            rotateAxis(crushAxis, repulseInfluence.mul(u.uRepulseStrength)).mul(
              grassMat
            )
          );
        });

        const grassLocalPosition = grassMat
          .mul(vec3(x, y, z))
          .add(grassOffset)
          .toVar();

        // Viewspace thicken. The strip's front face points +z; seen from
        // behind, `facing` flips sign so the widening still goes outwards
        const viewDir = normalize(cameraPosition.sub(bladeWorldPos));
        const grassFaceNormal = grassMat.mul(vec3(0, 0, 1));
        const facing = dot(grassFaceNormal, viewDir).toVar();
        const viewDotNormal = abs(facing);
        const thickenSide = select(facing.greaterThanEqual(0), 1, -1);
        const viewSpaceThickenFactor = easeOut(
          float(1).sub(viewDotNormal),
          4
        ).mul(smoothstep(0, 0.2, viewDotNormal));

        // Along the camera's right axis, applied in local space (the mesh
        // has no rotation or scale, so world and local axes match)
        const cameraRight = vec3(
          cameraViewMatrix.element(0).x,
          cameraViewMatrix.element(1).x,
          cameraViewMatrix.element(2).x
        );
        grassLocalPosition.addAssign(
          cameraRight.mul(
            viewSpaceThickenFactor
              .mul(xSide.sub(0.5))
              .mul(width)
              .mul(0.5)
              .mul(thickenSide)
          )
        );

        position.assign(grassLocalPosition);

        // Smooth shading normal (bend + crush through grassMat), lit only
        if (lit) {
          vBendNormal.assign(normalize(toView(grassMat.mul(bendNormal))));
          vSideTilt.assign(
            toView(
              grassMat.mul(
                vec3(xSide.mul(2).sub(1).mul(u.uNormalRounding), 0, 0)
              )
            )
          );
        }

        const variant = patchVariant(u, bladeWorldPos);

        // One lighting factor per variant, darkening or lightening the root
        // and tip colors together
        vPatchLighting.assign(mix(u.uLighting1, u.uLighting2, variant));
        vGrassUv.assign(vec2(select(isFlower, 1, 0), heightPercent));
      });
    });

    return position;
  })();

  // --- Fragment
  const cloudShadow = cloudShadowFactor(vGrassWorldPos.xz);
  // Root -> tip gradient (see the MSAA note at the top: clamped here)
  const grassColor = max(
    mix(u.uColorBottom, u.uColorTop, clamp(vGrassUv.y, 0, 1)).mul(
      vPatchLighting
    ),
    0
  );
  // Flower blades fade to red towards the tip. max: a tip length of 0 makes
  // both smoothstep edges 1.0, which is NaN exactly at the tip
  const tipMask = select(
    vGrassUv.x.greaterThan(0.5),
    smoothstep(float(1).sub(max(u.uRedTipLength, 1e-5)), 1, vGrassUv.y),
    0
  );

  if (lit) {
    // The bend normal flips on back faces, the edge tilt does not, so the
    // rounding reads the same from either side. max: extrapolated samples
    // can cancel the sum, and normalize(0) is NaN
    const fragNormal = vBendNormal.mul(faceDirection).add(vSideTilt);
    // The up bias comes after the back-face flip: flipping an up-pointing
    // normal would light back faces from below
    const upView = normalize(toView(vec3(0, 1, 0)));
    const biased = mix(
      fragNormal.div(max(length(fragNormal), 1e-5)),
      upView,
      u.uNormalUp
    );
    material.normalNode = biased.div(max(length(biased), 1e-5));

    // The tip goes through the emissive slot (added after the lighting) so
    // the scene lights neither darken nor tint it; the diffuse underneath is
    // faded out. It still receives the cloud shadows
    material.colorNode = vec4(
      grassColor.mul(float(1).sub(tipMask)).mul(cloudShadow),
      1
    );
    material.emissiveNode = u.uRedTipColor.mul(tipMask).mul(cloudShadow);
  } else {
    material.colorNode = vec4(
      mix(grassColor, u.uRedTipColor, tipMask).mul(cloudShadow),
      1
    );
  }

  return material;
};

export { createGrassUniforms, createGrassMaterial };
