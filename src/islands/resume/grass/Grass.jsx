import { useEffect, useMemo } from 'react';
import { useControls } from '#debug/useControls.jsx';
import * as THREE from 'three/webgpu';

import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

import { useGrassPlacement } from './grassPlacement.js';
import { trampleTexture, useTrample } from './useTrample.js';

import { createGrassMaterial, createGrassUniforms } from '#shaders/grass.js';

import {
  useSpiralGrassHeightTexture,
  useVoronoiPerlinTexture,
} from '#utils/packedTextures.js';

// Idle wind is unsolicited motion: damp its amplitude under reduced motion
// (trample stays untouched - the character's own footsteps are earned)
const WIND_REDUCTION = REDUCED_MOTION_AT_LOAD ? 0.25 : 1;

const Grass = () => {
  // Controls. The titles are subfolders of the "Grass" group in the debug
  // panel (inspectorControls.jsx FOLDER_TREE)

  // Blades: shape, colors, amount and where the patch sits
  const bladeControls = useControls('Blades', {
    // Single root -> tip color gradient shared by all blades; the patch
    // noise at each blade root picks one of two variants (~half the field
    // each), grouping neighbouring blades into patches
    colorBottom: '#014f16',
    colorTop: '#00ff3a',
    // Gradient lighting of each patch variant: darkens (< 1) or lightens
    // (> 1) the root and tip colors evenly, keeping their hues
    lighting1: { value: 0.36, min: 0, max: 3, step: 0.01 },
    lighting2: { value: 0.98, min: 0, max: 3, step: 0.01 },
    // World-space scale of the color noise (higher = smaller patches)
    colorNoiseScale: { value: 0.028, min: 0, max: 0.5, step: 0.001 },
    // 0 = wide soft blends between patches, 1 = hard edges
    colorSharpness: { value: 0.45, min: 0, max: 1, step: 0.01 },
    // Voronoi patches: procedural cells (shaders/grass.js) where each cell
    // takes one flat variant, ~half the cells each, with perlin-warped
    // borders. Blends with the perlin patch selector:
    // 0 = pure perlin blobs, 1 = pure voronoi cells
    voronoiMix: { value: 0.65, min: 0, max: 1, step: 0.01 },
    // Cell density, cells per world unit (higher = smaller patches)
    voronoiScale: { value: 0.29, min: 0.05, max: 2, step: 0.01 },
    // Perlin warp bending the cell borders, in cell units
    // (0 = straight voronoi edges)
    voronoiWarpStrength: { value: 0.98, min: 0, max: 3, step: 0.01 },
    // Scale of the warping perlin (lower = broader, smoother bends)
    voronoiWarpScale: { value: 0.08, min: 0, max: 0.5, step: 0.001 },
    // Scales the two gradient colors: < 1 darkens, > 1 brightens past the
    // picked colors (HDR, can feed bloom)
    brightness: { value: 1.52, min: 0, max: 2, step: 0.01 },
    // Visible blades: placement only spawns them where the height mask has
    // grass (~27% of the patch), so 22000 matches the density the old
    // 80000-over-the-whole-square gave
    count: { value: 22000, min: 0, max: 200000, step: 1 },
    // 1 = a single quad per blade, no mid loop cut (the bend is carried by
    // the shading normal instead of the silhouette)
    segmentsCount: { value: 1, min: 1, max: 10, step: 1 },
    width: { value: 0.129, min: 0, max: 0.2, step: 0.001 },
    height: { value: 0.491, min: 0, max: 1, step: 0.001 },
    squared: false,
    patchSize: { value: 11.7, min: 11, max: 13, step: 0.001 },
    position: { value: [-8.88, 6.83, -52.98], step: 0.001 },
  });

  // Flowers: the rare squared blades with a red tip
  const flowerControls = useControls('Flowers', {
    amount: { value: 0.0035, min: 0, max: 0.05, step: 0.0001 },
    height: { value: 0.447, min: 0, max: 1.5, step: 0.001 },
    width: { value: 0.083, min: 0, max: 0.5, step: 0.001 },
    // How close the two bottom vertices sit (fraction of the full width,
    // 1 = no pinch)
    baseWidth: { value: 0.16, min: 0, max: 1, step: 0.01 },
    tipColor: '#ff0000',
    // Portion of the blade covered by the red tip (0-1)
    tipLength: { value: 0.21, min: 0, max: 1, step: 0.01 },
  });

  // Rendering: material, shading and the per-blade culls
  const renderControls = useControls('Rendering', {
    // Base material: MeshBasicMaterial (unlit, cheapest, flat stylized
    // color) or MeshStandardMaterial (scene lights + the smooth shading
    // normal). Recreates the material.
    lit: true,
    // Lit only. Fake rounded cross-section: shading normal tilted toward
    // the blade edges (0 = flat strip, 1 = 45 degrees at the edges)
    normalRounding: { value: 0, min: 0, max: 1, step: 0.01 },
    // Lit only. Blend of the shading normal toward world up: at 0 the sun
    // lights every blade differently (their normals point sideways in
    // random directions), at 1 all blades are lit like the ground plane so
    // identical palette colors render identical blades
    normalUp: { value: 1, min: 0, max: 1, step: 0.01 },
    // Distance thinning, world units from the camera: full density up to
    // thinStart, no blades past thinEnd (blades shrink out in between)
    thinStart: { value: 18, min: 5, max: 60, step: 0.5 },
    thinEnd: { value: 28, min: 5, max: 120, step: 0.5 },
    // Half angle of the view cone blades survive, degrees off the camera
    // axis. The camera fov is 40, so 84 leaves margin on any aspect ratio
    // and for the blade height; 180 disables the cull
    cullAngle: { value: 84, min: 30, max: 180, step: 1 },
  });

  const windControls = useControls('Wind', {
    scale: { value: 0.046, min: 0, max: 0.2, step: 0.001 },
    strength: { value: 1.45, min: -5, max: 5, step: 0.01 },
    speed: { value: 0.07, min: 0, max: 5, step: 0.01 },
  });

  // Trample: how the blades react under and around the character
  const trampleControls = useControls('Trample', {
    // Max lean at full push, radians (PI/2 = flat on the ground)
    strength: { value: 1.0, min: 0, max: 1.57, step: 0.01 },
    // Extra height shortening at full push (0-1)
    squash: { value: 0.2, min: 0, max: 1, step: 0.01 },
    // Footprint radius, world units; landings press a wider ring
    radius: { value: 0.7, min: 0.1, max: 3, step: 0.05 },
    landingRadius: { value: 1.6, min: 1, max: 3, step: 0.05 },
    // How fast a jump or landing folds the blades down (1/s); the impact
    // press lasts ~3/x seconds instead of stamping flat in a single frame
    impactFold: { value: 30, min: 5, max: 120, step: 1 },
    // How fast blades fold under the feet (1/s)
    pressSpeed: { value: 25, min: 1, max: 60, step: 1 },
    // 0: blades lean straight away from the feet. 1: a running character
    // lays them all along its direction of travel
    directionality: { value: 0.6, min: 0, max: 1, step: 0.01 },
    // Return spring: stiffness sets how fast blades stand back up, the
    // damping ratio how much they wobble on the way (1 = no overshoot)
    stiffness: { value: 60, min: 5, max: 300, step: 1 },
    dampingRatio: { value: 0.6, min: 0.1, max: 1.5, step: 0.01 },
    // Master amount (0 disables the crush without touching the field)
    amount: { value: 1, min: 0, max: 1, step: 0.01 },
  });

  // Blade roots, placed on the CPU where the mask has grass
  const placement = useGrassPlacement(bladeControls.count);

  // Geometry: one quad strip per blade, front face only (+z, CCW). The
  // material is DoubleSide so the same triangles show from behind - half the
  // vertices and triangles of the old front + back copy. No vertex
  // attributes besides the per-instance root: the shader builds the blade
  // from gl_VertexID.
  const grassGeometry = useMemo(() => {
    const indices = [];
    for (let i = 0; i < bladeControls.segmentsCount; ++i) {
      const vi = i * 2;
      indices.push(vi, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3);
    }

    const grassGeometry = new THREE.InstancedBufferGeometry();
    grassGeometry.instanceCount = placement.length / 2;
    grassGeometry.setIndex(indices);
    // Placeholders: the blade is built from the vertex id, but the node
    // material still binds position/normal attributes
    const vertexCount = (bladeControls.segmentsCount + 1) * 2;
    grassGeometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3)
    );
    grassGeometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3)
    );
    grassGeometry.setAttribute(
      'aBladePosition',
      new THREE.InstancedBufferAttribute(placement, 2)
    );
    grassGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      1 + bladeControls.patchSize * 2
    );

    return grassGeometry;
  }, [bladeControls.segmentsCount, bladeControls.patchSize, placement]);

  // Materials. The height map lives in the green channel of the packed
  // spiral/grass-height texture; it used to be loaded with flipY = false, so
  // the vertex shader flips patchUv.y before sampling instead.
  const grassHeightTexture = useSpiralGrassHeightTexture();

  const perlinNoiseTexture = useVoronoiPerlinTexture();

  // Uniform nodes, created once; the controls write them below
  const uniforms = useMemo(
    () =>
      createGrassUniforms({
        heightTexture: grassHeightTexture,
        perlinTexture: perlinNoiseTexture,
        trampleTexture,
      }),
    []
  );

  // Unlit MeshBasicNodeMaterial or, with the `lit` control,
  // MeshStandardNodeMaterial (scene lighting + smooth shading normal). Only
  // that switch rebuilds the material; every other control is a uniform.
  // The trample map is left out on mobile: no vertex fetch, no crush
  const grassMaterial = useMemo(
    () =>
      createGrassMaterial({
        uniforms,
        lit: renderControls.lit,
        trample: !IS_MOBILE_DEVICE,
      }),
    [uniforms, renderControls.lit]
  );

  useEffect(() => () => grassMaterial.dispose(), [grassMaterial]);
  useEffect(() => () => grassGeometry.dispose(), [grassGeometry]);

  // Keep the uniforms in sync with the controls
  useEffect(() => {
    uniforms.uColorBottom.value = new THREE.Color(
      bladeControls.colorBottom
    ).multiplyScalar(bladeControls.brightness);
    uniforms.uColorTop.value = new THREE.Color(
      bladeControls.colorTop
    ).multiplyScalar(bladeControls.brightness);
    uniforms.uLighting1.value = bladeControls.lighting1;
    uniforms.uLighting2.value = bladeControls.lighting2;
    uniforms.uColorNoiseScale.value = bladeControls.colorNoiseScale;
    uniforms.uColorSharpness.value = bladeControls.colorSharpness;
    uniforms.uVoronoiMix.value = bladeControls.voronoiMix;
    uniforms.uVoronoiScale.value = bladeControls.voronoiScale;
    uniforms.uVoronoiWarpStrength.value = bladeControls.voronoiWarpStrength;
    uniforms.uVoronoiWarpScale.value = bladeControls.voronoiWarpScale;
    uniforms.uSegments.value = bladeControls.segmentsCount;
    uniforms.uPatchSize.value = bladeControls.patchSize;
    uniforms.uBladeWidth.value = bladeControls.width;
    uniforms.uBladeHeight.value = bladeControls.height;
    uniforms.uSquareShape.value = bladeControls.squared ? 1 : 0;
    uniforms.uPositionX.value = bladeControls.position[0];
    uniforms.uPositionZ.value = bladeControls.position[2];

    uniforms.uRedTipColor.value = new THREE.Color(flowerControls.tipColor);
    uniforms.uRedTipLength.value = flowerControls.tipLength;
    uniforms.uFlowerAmount.value = flowerControls.amount;
    uniforms.uFlowerHeight.value = flowerControls.height;
    uniforms.uFlowerWidth.value = flowerControls.width;
    uniforms.uFlowerBaseWidth.value = flowerControls.baseWidth;

    uniforms.uWindScale.value = windControls.scale;
    uniforms.uWindStrength.value = windControls.strength * WIND_REDUCTION;
    uniforms.uWindSpeed.value = windControls.speed;

    uniforms.uThinDistance.value.set(
      renderControls.thinStart,
      renderControls.thinEnd
    );
    uniforms.uCullCos.value = Math.cos(
      THREE.MathUtils.degToRad(renderControls.cullAngle)
    );
    uniforms.uNormalRounding.value = renderControls.normalRounding;
    uniforms.uNormalUp.value = renderControls.normalUp;

    uniforms.uRepulseStrength.value = trampleControls.strength;
    uniforms.uRepulseSquash.value = trampleControls.squash;
    uniforms.uTrampleStrength.value = trampleControls.amount;
  }, [
    bladeControls,
    flowerControls,
    renderControls,
    windControls,
    trampleControls,
    uniforms,
  ]);

  useTrample(trampleControls, {
    position: bladeControls.position,
    size: bladeControls.patchSize,
  });

  return (
    <mesh
      geometry={grassGeometry}
      material={grassMaterial}
      position={bladeControls.position}
    />
  );
};

export { Grass };
