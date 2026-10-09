import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE, IS_PHOTO_MODE } from '#utils/utils.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';
import { DEFAULT_CHARACTER_SPEED } from '#controller/constants.js';

import { useGrassPlacement } from './grassPlacement.js';

import {
  createGrassMaterial,
  createGrassUniforms,
} from '#shaders/grass/grass.js';

import {
  useSpiralGrassHeightTexture,
  useVoronoiPerlinTexture,
} from '#utils/packedTextures.js';

// Trample field: a small map over the patch XZ where each texel holds a
// world-space push vector - the direction the blades lean, with its length
// as the strength (0-1). Every frame the character's footprint presses its
// texels toward a target push (radially away from the feet, blended with the
// running direction), and every texel relaxes back to zero as a damped
// spring. Blades fold under the feet, part around the stride, and stand back
// up with a soft settle instead of the old linear fade. The simulation runs
// on floats; the RG8 copy is what the vertex shader samples (byte 128 = 0).
// Idle wind is unsolicited motion: damp its amplitude under reduced motion
// (trample stays untouched - the character's own footsteps are earned)
const WIND_REDUCTION = REDUCED_MOTION_AT_LOAD ? 0.25 : 1;

const TRAMPLE_SIZE = 128;
const TRAMPLE_TEXELS = TRAMPLE_SIZE * TRAMPLE_SIZE;
const trampleX = new Float32Array(TRAMPLE_TEXELS);
const trampleZ = new Float32Array(TRAMPLE_TEXELS);
const trampleVelocityX = new Float32Array(TRAMPLE_TEXELS);
const trampleVelocityZ = new Float32Array(TRAMPLE_TEXELS);
const trampleData = new Uint8Array(TRAMPLE_TEXELS * 2).fill(128);

// Whether any texel still moves. Away from the patch the field is at rest and
// the per-frame spring loop + GPU upload are skipped
let trampleActive = false;
// Displacement / velocity below this counts as settled
const TRAMPLE_REST = 1e-3;
// Step cap: keeps the semi-implicit spring stable and stops a frame hitch
// from launching the blades
const TRAMPLE_MAX_DT = 1 / 30;

const trampleTexture = new THREE.DataTexture(
  trampleData,
  TRAMPLE_SIZE,
  TRAMPLE_SIZE,
  THREE.RGFormat,
  THREE.UnsignedByteType
);
trampleTexture.colorSpace = THREE.NoColorSpace;
// Updated every frame: skip the mipmap regeneration, sample linearly
trampleTexture.generateMipmaps = false;
trampleTexture.minFilter = THREE.LinearFilter;
trampleTexture.magFilter = THREE.LinearFilter;
trampleTexture.needsUpdate = true;

// Presses the footprint into the field. Center and radius in texels; the
// texel grid maps to the world as u -> -x, v -> +z (same mapping as patchUv
// in the vertex shader), and the stored vectors are world-space xz.
// - falloff (1 - r^2)^2: full push under the feet, zero slope at the rim
// - direction: radial away from the feet, blended toward the running
//   direction so a moving character lays the blades along its path instead
//   of pointing them all back at where it stands
// - blend: how much of the way to the target this frame (1 = snap)
// - pressure: 0-1 weight on the target (how hard the character is treading:
//   full at running speed, fading out as it slows down). Below 1, texels the
//   target no longer holds down are left to the spring instead of being
//   dragged, so a stop releases the blades continuously
const pressFootprint = (
  centerX,
  centerY,
  radius,
  moveDirX,
  moveDirZ,
  directionality,
  blend,
  pressure
) => {
  const minX = Math.max(0, Math.floor(centerX - radius));
  const maxX = Math.min(TRAMPLE_SIZE - 1, Math.ceil(centerX + radius));
  const minY = Math.max(0, Math.floor(centerY - radius));
  const maxY = Math.min(TRAMPLE_SIZE - 1, Math.ceil(centerY + radius));
  const invRadiusSq = 1 / (radius * radius);

  for (let iy = minY; iy <= maxY; iy++) {
    for (let ix = minX; ix <= maxX; ix++) {
      const dx = ix + 0.5 - centerX;
      const dy = iy + 0.5 - centerY;
      const r2 = (dx * dx + dy * dy) * invRadiusSq;
      if (r2 >= 1) continue;
      const falloff = (1 - r2) * (1 - r2);

      // Radial world direction (texel +x is world -x, texel +y is world +z)
      const r = Math.sqrt(dx * dx + dy * dy);
      let dirX = r > 1e-4 ? -dx / r : moveDirX;
      let dirZ = r > 1e-4 ? dy / r : moveDirZ;
      dirX = dirX * (1 - directionality) + moveDirX * directionality;
      dirZ = dirZ * (1 - directionality) + moveDirZ * directionality;
      const dirLength = Math.hypot(dirX, dirZ);
      if (dirLength < 1e-4) continue;
      const targetLength = falloff * pressure;
      const targetX = (dirX / dirLength) * targetLength;
      const targetZ = (dirZ / dirLength) * targetLength;

      const i = iy * TRAMPLE_SIZE + ix;
      // Pressing mostly adds: a texel the trail already bent harder keeps its
      // bend and only turns slowly toward the new direction. While the tread
      // eases off, such texels are released to the spring entirely.
      const current = Math.hypot(trampleX[i], trampleZ[i]);
      let w = blend;
      if (targetLength < current) {
        if (pressure < 1) continue;
        w = blend * 0.25;
      }
      trampleX[i] += (targetX - trampleX[i]) * w;
      trampleZ[i] += (targetZ - trampleZ[i]) * w;
      // The foot holds the blades still
      trampleVelocityX[i] *= 1 - w;
      trampleVelocityZ[i] *= 1 - w;
    }
  }
};

// One spring step over the whole field; returns whether anything still moves
const relaxTrample = (dt, stiffness, damping) => {
  let moving = false;
  const restSq = TRAMPLE_REST * TRAMPLE_REST;
  for (let i = 0; i < TRAMPLE_TEXELS; i++) {
    let x = trampleX[i];
    let z = trampleZ[i];
    let vx = trampleVelocityX[i];
    let vz = trampleVelocityZ[i];
    if (x * x + z * z < restSq && vx * vx + vz * vz < restSq) {
      trampleX[i] = 0;
      trampleZ[i] = 0;
      trampleVelocityX[i] = 0;
      trampleVelocityZ[i] = 0;
      continue;
    }
    vx += (-stiffness * x - damping * vx) * dt;
    vz += (-stiffness * z - damping * vz) * dt;
    x += vx * dt;
    z += vz * dt;
    // A blade can't lean past flat
    const lengthSq = x * x + z * z;
    if (lengthSq > 1) {
      const inv = 1 / Math.sqrt(lengthSq);
      x *= inv;
      z *= inv;
    }
    trampleX[i] = x;
    trampleZ[i] = z;
    trampleVelocityX[i] = vx;
    trampleVelocityZ[i] = vz;
    moving = true;
  }
  return moving;
};

const encodeTrample = () => {
  for (let i = 0; i < TRAMPLE_TEXELS; i++) {
    trampleData[i * 2] = 128 + Math.round(trampleX[i] * 127);
    trampleData[i * 2 + 1] = 128 + Math.round(trampleZ[i] * 127);
  }
  trampleTexture.needsUpdate = true;
};

const Grass = () => {
  // Character tracking for the trample: previous grounded state (takeoff /
  // landing detection) and a smoothed world-space velocity from position
  // deltas. Takeoff and landing start an impulse press anchored where they
  // happened, folding the blades over a few frames instead of one
  const wasGroundedRef = useRef(true);
  const previousPositionRef = useRef(null);
  const velocityRef = useRef(new THREE.Vector2());
  const impulseRef = useRef({ timer: 0, u: 0, v: 0, radiusScale: 1, peak: 1 });

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
    // Voronoi patches: procedural cells (shaders/grass/grass.js) where each cell
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
  // spiral/grass/star texture; it used to be loaded with flipY = false, so
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
    uniforms.uGrassParameters.value.x = bladeControls.segmentsCount;
    uniforms.uGrassParameters.value.y = bladeControls.patchSize;
    uniforms.uGrassParameters.value.z = bladeControls.width;
    uniforms.uGrassParameters.value.w = bladeControls.height;
    uniforms.uSquareShape.value = bladeControls.squared ? 1 : 0;
    uniforms.uPositionX.value = bladeControls.position[0];
    uniforms.uPositionZ.value = bladeControls.position[2];

    uniforms.uRedTipColor.value = new THREE.Color(flowerControls.tipColor);
    uniforms.uRedTipLength.value = flowerControls.tipLength;
    uniforms.uFlowerAmount.value = flowerControls.amount;
    uniforms.uFlowerHeight.value = flowerControls.height;
    uniforms.uFlowerWidth.value = flowerControls.width;
    uniforms.uFlowerBaseWidth.value = flowerControls.baseWidth;

    uniforms.uHeightDataTexture.value = grassHeightTexture;
    uniforms.uPerlinNoiseTexture.value = perlinNoiseTexture;

    uniforms.uWindScale.value = windControls.scale;
    uniforms.uWindStrength.value = windControls.strength * WIND_REDUCTION;
    uniforms.uWindSpeed.value = windControls.speed;

    if (!IS_PHOTO_MODE) {
      uniforms.uThinDistance.value.set(
        renderControls.thinStart,
        renderControls.thinEnd
      );
    }
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
    grassHeightTexture,
    perlinNoiseTexture,
    uniforms,
  ]);

  useFrame((state, delta) => {
    // The whole trample pipeline (simulation + texture upload) is off on
    // mobile, where the material is built without the trample fetch
    if (IS_MOBILE_DEVICE) {
      return;
    }

    const dt = Math.min(delta, TRAMPLE_MAX_DT);

    // Character state. The position is published by the camera hook every
    // frame; the velocity is estimated from its deltas and smoothed so the
    // press direction doesn't jitter with the physics substeps
    const position = useStore.getState().characterPosition;
    const grounded = useStore.getState().characterGrounded;
    const justLanded = grounded && !wasGroundedRef.current;
    const justJumped = !grounded && wasGroundedRef.current;
    wasGroundedRef.current = grounded;

    const velocity = velocityRef.current;
    if (position && previousPositionRef.current && delta > 0) {
      const previous = previousPositionRef.current;
      const smoothing = 1 - Math.exp(-12 * delta);
      velocity.x +=
        ((position.x - previous.x) / delta - velocity.x) * smoothing;
      velocity.y +=
        ((position.z - previous.z) / delta - velocity.y) * smoothing;
    }
    previousPositionRef.current = position;

    // Tread pressure from the smoothed speed: full when running, fading to 0
    // as the character slows so a stop releases the blades over the same
    // ~0.2s the velocity estimate decays, never on/off. Airborne (the jump
    // handler clears the grounded flag) there is no tread press
    const speed = velocity.length();
    const treadPressure = THREE.MathUtils.smoothstep(speed, 0.15, 1.2);
    const impulse = impulseRef.current;
    if (position) {
      const [patchX, , patchZ] = bladeControls.position;
      const u = ((-position.x + patchX) / bladeControls.patchSize) * 0.5 + 0.5;
      const v = ((position.z - patchZ) / bladeControls.patchSize) * 0.5 + 0.5;
      const insidePatch = u > -0.1 && u < 1.1 && v > -0.1 && v < 1.1;
      // World units -> texels (the map spans 2 * patchSize)
      const texelsPerUnit = TRAMPLE_SIZE / (2 * bladeControls.patchSize);

      // Takeoff and landing start an impulse press anchored at the feet: a
      // purely radial ring folding at impactFold instead of stamping flat in
      // one frame. Landing presses the wider landingRadius ring at full
      // strength; takeoff a lighter puff barely wider than the footprint
      if ((justLanded || justJumped) && insidePatch) {
        impulse.timer = 3 / trampleControls.impactFold;
        impulse.u = u;
        impulse.v = v;
        impulse.radiusScale = justLanded ? trampleControls.landingRadius : 1.2;
        impulse.peak = justLanded ? 1 : 0.65;
      }

      if (impulse.timer > 0) {
        impulse.timer -= dt;
        pressFootprint(
          impulse.u * TRAMPLE_SIZE,
          impulse.v * TRAMPLE_SIZE,
          trampleControls.radius * texelsPerUnit * impulse.radiusScale,
          0,
          0,
          0,
          1 - Math.exp(-trampleControls.impactFold * dt),
          impulse.peak
        );
        trampleActive = true;
      }

      if (grounded && treadPressure > 0 && insidePatch) {
        // Fully directional only at running speed, radial when idle
        const moveFactor = Math.min(speed / DEFAULT_CHARACTER_SPEED, 1);
        const moveDirX = speed > 0.05 ? velocity.x / speed : 0;
        const moveDirZ = speed > 0.05 ? velocity.y / speed : 0;

        pressFootprint(
          u * TRAMPLE_SIZE,
          v * TRAMPLE_SIZE,
          trampleControls.radius * texelsPerUnit,
          moveDirX,
          moveDirZ,
          trampleControls.directionality * moveFactor,
          1 - Math.exp(-trampleControls.pressSpeed * dt),
          treadPressure
        );
        trampleActive = true;
      }
    }

    if (!trampleActive) return;

    // Damped spring back to rest. Critical damping is 2 * sqrt(k); the ratio
    // control scales it (below 1 the blades overshoot and wobble a little)
    const stiffness = trampleControls.stiffness;
    const damping = 2 * Math.sqrt(stiffness) * trampleControls.dampingRatio;
    trampleActive = relaxTrample(dt, stiffness, damping);

    // The frame the field settles still uploads once (all zeros), then the
    // pipeline goes quiet
    encodeTrample();
  });

  const scene = useThree(state => state.scene);

  useEffect(() => {
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    // controls changes recreate the material, so this effect re-runs and
    // keeps the position in sync — no need to set it per frame
    grass.position.set(
      bladeControls.position[0],
      bladeControls.position[1],
      bladeControls.position[2]
    );

    grass.castShadow = false;
    grass.receiveShadow = false;

    scene.add(grass);

    return () => {
      scene.remove(grass);
    };
  }, [grassGeometry, grassMaterial, scene, bladeControls.position]);

  return null;
};

export { Grass };
