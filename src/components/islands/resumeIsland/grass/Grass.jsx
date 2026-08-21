import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { cloudShadowUniforms } from '#environment/CloudShadows.jsx';
import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import grassFragmentShader from '#shaders/grass/fragment.glsl';
import grassVertexShader from '#shaders/grass/vertex.glsl';

import grassHeightTextureAsset from '#assets/textures/grass-height-map.webp';
import perlinNoiseImage from '#assets/textures/perlin.png';

// Trample map: a small buffer mapped onto the patch XZ. Each texel stores
// the remaining crush influence (sampled directly by the vertex shader) and
// fades linearly to zero, so a crushed blade starts straightening the moment
// the character leaves and travels back to its rest pose in exactly
// trailDuration seconds. Floats fade without 8-bit rounding residue; the
// byte copy is what gets uploaded to the GPU.
const TRAMPLE_SIZE = 128;
const trampleValues = new Float32Array(TRAMPLE_SIZE * TRAMPLE_SIZE);
const trampleData = new Uint8Array(TRAMPLE_SIZE * TRAMPLE_SIZE);

// Radial glow profile stamped at the character position (same stops as the
// old canvas gradient). Kept tight (steep falloff): the crush follows it
// directly, so a soft tail would read much larger than the glow itself.
const glowProfile = r => {
  if (r >= 1) return 0;
  if (r < 0.5) return 1 - (r / 0.5) * 0.15; // 1 -> 0.85
  if (r < 0.8) return 0.85 - ((r - 0.5) / 0.3) * 0.6; // 0.85 -> 0.25
  return 0.25 - ((r - 0.8) / 0.2) * 0.25; // 0.25 -> 0
};

const trampleTexture = new THREE.DataTexture(
  trampleData,
  TRAMPLE_SIZE,
  TRAMPLE_SIZE,
  THREE.RedFormat,
  THREE.UnsignedByteType
);
trampleTexture.colorSpace = THREE.NoColorSpace;
// Updated every frame: skip the mipmap regeneration, sample linearly
trampleTexture.generateMipmaps = false;
trampleTexture.minFilter = THREE.LinearFilter;
trampleTexture.magFilter = THREE.LinearFilter;
trampleTexture.needsUpdate = true;

const Grass = () => {
  const grassRef = useRef(null);

  // Previous grounded state, to detect the landing frame after a jump
  const wasGroundedRef = useRef(true);

  // Controls
  const controls = useControls(
    'Grass',
    {
      colorBase: '#3bd532',
      colorTop: '#d4ff3b',
      redTipColor: '#ff0000',
      redTipLength: { value: 0.44, min: 0, max: 1, step: 0.01 },
      flowerAmount: { value: 0.0035, min: 0, max: 0.05, step: 0.0001 },
      flowerHeight: { value: 0.447, min: 0, max: 1.5, step: 0.001 },
      flowerWidth: { value: 0.083, min: 0, max: 0.5, step: 0.001 },
      // How close the two bottom vertices sit (fraction of the full width,
      // 1 = no pinch)
      flowerBaseWidth: { value: 0.16, min: 0, max: 1, step: 0.01 },
      count: { value: 80000, min: 0, max: 16 * 50000, step: 1 },
      segmentsCount: { value: 3, min: 1, max: 10, step: 1 },
      patchSize: { value: 11.7, min: 11, max: 13, step: 0.001 },
      width: { value: 0.08, min: 0, max: 0.2, step: 0.001 },
      height: { value: 0.417, min: 0, max: 1, step: 0.001 },
      squared: false,
      position: { value: [-8.88, 6.83, -52.98], step: 0.001 },
    },
    { collapsed: true }
  );

  const windControls = useControls(
    'Wind',
    {
      scale: { value: 0.046, min: 0, max: 0.2, step: 0.001 },
      strength: { value: 1.45, min: -5, max: 5, step: 0.01 },
      speed: { value: 0.07, min: 0, max: 5, step: 0.01 },
    },
    { collapsed: true }
  );

  const repulseControls = useControls(
    'Repulse',
    {
      strength: { value: 0.4, min: 0, max: 2, step: 0.01 }, // radians of tilt
      squash: { value: 0.14, min: 0, max: 1, step: 0.01 },
      // Trample map: how long the trail takes to fade out (seconds), glow
      // diameter as a fraction of the patch, and how much the trail
      // crushes the blades. trailDuration = seconds a crushed blade takes to
      // travel back to its rest pose once the character leaves
      trailDuration: { value: 0.3, min: 0.1, max: 6, step: 0.05 },
      trailRadius: { value: 0.06, min: 0.002, max: 0.5, step: 0.001 },
      trampleStrength: { value: 1, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true, reset: true }
  );

  // Geometry
  const grassGeometry = useMemo(() => {
    const vertexNumber = (controls.segmentsCount + 1) * 2;
    const indices = [];

    for (let i = 0; i < controls.segmentsCount; ++i) {
      const vi = i * 2;
      indices[i * 12] = vi;
      indices[i * 12 + 1] = vi + 1;
      indices[i * 12 + 2] = vi + 2;

      indices[i * 12 + 3] = vi + 2;
      indices[i * 12 + 4] = vi + 1;
      indices[i * 12 + 5] = vi + 3;

      const fi = vertexNumber + vi;
      indices[i * 12 + 6] = fi + 2;
      indices[i * 12 + 7] = fi + 1;
      indices[i * 12 + 8] = fi;

      indices[i * 12 + 9] = fi + 3;
      indices[i * 12 + 10] = fi + 1;
      indices[i * 12 + 11] = fi + 2;
    }

    const grassGeometry = new THREE.InstancedBufferGeometry();
    grassGeometry.instanceCount = controls.count;
    grassGeometry.setIndex(indices);
    grassGeometry.boundingSphere = new THREE.Sphere(
      new THREE.Vector3(0, 0, 0),
      1 + controls.patchSize * 2
    );

    return grassGeometry;
  }, [controls.segmentsCount, controls.patchSize, controls.count]);

  // Materials
  const grassHeightTexture = useTexture(grassHeightTextureAsset, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.flipY = false;
  });

  const perlinNoiseTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  const grassMaterial = useMemo(
    () =>
      // Wraps MeshStandardMaterial so the blades receive the scene lighting
      // (directional + ambient); the class (not an instance) is passed
      // because CSM v6 mutates its baseMaterial
      new CustomShaderMaterial({
        baseMaterial: THREE.MeshStandardMaterial,
        roughness: 1,
        metalness: 0,
        // The trample map (texture + crush) is compiled out on mobile
        defines: IS_MOBILE_DEVICE ? {} : { USE_TRAMPLE: '' },
        uniforms: {
          uTime: { value: 0 },
          uGrassParameters: {
            value: new THREE.Vector4(
              controls.segmentsCount,
              controls.patchSize,
              controls.width,
              controls.height
            ),
          },
          uGrassBaseColor: { value: new THREE.Color(controls.colorBase) },
          uGrassTopColor: { value: new THREE.Color(controls.colorTop) },
          uRedTipColor: { value: new THREE.Color(controls.redTipColor) },
          uRedTipLength: { value: controls.redTipLength },
          uFlowerAmount: { value: controls.flowerAmount },
          uFlowerHeight: { value: controls.flowerHeight },
          uFlowerWidth: { value: controls.flowerWidth },
          uFlowerBaseWidth: { value: controls.flowerBaseWidth },
          // The stems match the blade tips
          uFlowerStemColor: {
            value: new THREE.Color(controls.colorTop),
          },
          uHeightDataTexture: { value: grassHeightTexture },
          uPerlinNoiseTexture: { value: perlinNoiseTexture },
          uSquareShape: { value: controls.squared },
          uPositionX: { value: 0 },
          uPositionZ: { value: 0 },
          uPlayerPosition: { value: new THREE.Vector3(0, 0, 0) },

          uWindScale: { value: windControls.scale },
          uWindStrength: { value: windControls.strength },
          uWindSpeed: { value: windControls.speed },

          uRepulseStrength: { value: repulseControls.strength },
          uRepulseSquash: { value: repulseControls.squash },
          uTrampleTexture: { value: trampleTexture },
          uTrampleStrength: { value: repulseControls.trampleStrength },

          // Shared with the island material so the clouds line up
          ...cloudShadowUniforms,
        },
        vertexShader: grassVertexShader,
        fragmentShader: grassFragmentShader,
        side: THREE.FrontSide,
      }),
    [controls, windControls, repulseControls, grassHeightTexture]
  );

  // Update material uniforms from Leva controls - Can remove when controls are removed
  useEffect(() => {
    grassMaterial.uniforms.uGrassBaseColor.value = new THREE.Color(
      controls.colorBase
    );
    grassMaterial.uniforms.uGrassTopColor.value = new THREE.Color(
      controls.colorTop
    );
    grassMaterial.uniforms.uRedTipColor.value = new THREE.Color(
      controls.redTipColor
    );
    grassMaterial.uniforms.uRedTipLength.value = controls.redTipLength;
    grassMaterial.uniforms.uFlowerAmount.value = controls.flowerAmount;
    grassMaterial.uniforms.uFlowerHeight.value = controls.flowerHeight;
    grassMaterial.uniforms.uFlowerWidth.value = controls.flowerWidth;
    grassMaterial.uniforms.uFlowerBaseWidth.value = controls.flowerBaseWidth;
    grassMaterial.uniforms.uFlowerStemColor.value = new THREE.Color(
      controls.colorTop
    );
    grassMaterial.uniforms.uHeightDataTexture.value = grassHeightTexture;
    grassMaterial.uniforms.uGrassParameters.value.x = controls.segmentsCount;
    grassMaterial.uniforms.uGrassParameters.value.y = controls.patchSize;
    grassMaterial.uniforms.uGrassParameters.value.z = controls.width;
    grassMaterial.uniforms.uGrassParameters.value.w = controls.height;
    grassMaterial.uniforms.uSquareShape.value = controls.squared;
    grassMaterial.uniforms.uWindScale.value = windControls.scale;
    grassMaterial.uniforms.uWindStrength.value = windControls.strength;
    grassMaterial.uniforms.uWindSpeed.value = windControls.speed;
    grassMaterial.uniforms.uRepulseStrength.value = repulseControls.strength;
    grassMaterial.uniforms.uRepulseSquash.value = repulseControls.squash;
    grassMaterial.uniforms.uTrampleStrength.value =
      repulseControls.trampleStrength;
    grassMaterial.uniforms.uPositionX.value = controls.position[0];
    grassMaterial.uniforms.uPositionZ.value = controls.position[2];
  }, [controls, windControls, repulseControls, grassHeightTexture, grassMaterial]);

  useEffect(() => {
    const unsubCharacterPosition = useStore.subscribe(
      state => [state.characterPosition],
      ([characterPosition]) => {
        grassMaterial.uniforms.uPlayerPosition.value = characterPosition;
      }
    );

    return () => {
      unsubCharacterPosition();
    };
  }, [grassMaterial]);

  useFrame(({ clock }) => {
    grassMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  // Update time for grass
  useFrame(({ clock }, delta) => {
    grassMaterial.uniforms.uTime.value = clock.elapsedTime;
    if (grassRef.current) {
      grassRef.current.position.set(
        controls.position[0],
        controls.position[1],
        controls.position[2]
      );
    }

    // The whole trample pipeline (buffer work + texture upload) is off on
    // mobile, where the shader compiles without USE_TRAMPLE anyway
    if (IS_MOBILE_DEVICE) {
      return;
    }

    // Trample map: fade every texel linearly, so a crushed blade starts
    // straightening immediately and finishes its travel back to rest in
    // exactly trailDuration seconds at any framerate
    const fadeStep = delta / repulseControls.trailDuration;
    for (let i = 0; i < trampleValues.length; i++) {
      const faded = trampleValues[i] - fadeStep;
      trampleValues[i] = faded > 0 ? faded : 0;
    }

    // The store subscription can leave the uniform undefined until the
    // character controller publishes its first position. Airborne
    // (jumping/falling) or idle character doesn't press the grass; the
    // existing trail keeps fading out underneath, so blades stand back up
    // under a character who stops moving. Landing (air -> ground
    // transition) stamps once even when idle, with a bigger impact glow.
    const playerPosition = grassMaterial.uniforms.uPlayerPosition.value;
    const { characterGrounded, isCharacterMoving } = useStore.getState();
    const grounded = characterGrounded !== false;
    const justLanded = grounded && !wasGroundedRef.current;
    wasGroundedRef.current = grounded;

    if (playerPosition && grounded && (isCharacterMoving || justLanded)) {
      const u =
        ((-playerPosition.x + controls.position[0]) / controls.patchSize) *
          0.5 +
        0.5;
      const v =
        ((playerPosition.z - controls.position[2]) / controls.patchSize) *
          0.5 +
        0.5;

      if (u > -0.1 && u < 1.1 && v > -0.1 && v < 1.1) {
        // Stamp the glow at the character position (same patch mapping as
        // the height map in the vertex shader), lighten-style: standing
        // still keeps the blades pressed down
        const glowRadius =
          repulseControls.trailRadius *
          TRAMPLE_SIZE *
          (justLanded ? 1.5 : 1) *
          0.5;
        const centerX = u * TRAMPLE_SIZE;
        const centerY = v * TRAMPLE_SIZE;
        const minX = Math.max(0, Math.floor(centerX - glowRadius));
        const maxX = Math.min(
          TRAMPLE_SIZE - 1,
          Math.ceil(centerX + glowRadius)
        );
        const minY = Math.max(0, Math.floor(centerY - glowRadius));
        const maxY = Math.min(
          TRAMPLE_SIZE - 1,
          Math.ceil(centerY + glowRadius)
        );

        for (let iy = minY; iy <= maxY; iy++) {
          for (let ix = minX; ix <= maxX; ix++) {
            const r =
              Math.hypot(ix + 0.5 - centerX, iy + 0.5 - centerY) / glowRadius;
            const glow = glowProfile(r);
            const index = iy * TRAMPLE_SIZE + ix;
            if (glow > trampleValues[index]) trampleValues[index] = glow;
          }
        }
      }
    }

    for (let i = 0; i < trampleValues.length; i++) {
      trampleData[i] = trampleValues[i] * 255;
    }
    trampleTexture.needsUpdate = true;
  });

  const scene = useThree(state => state.scene);

  useEffect(() => {
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);

    scene.add(grass);
    grassRef.current = grass;

    return () => {
      scene.remove(grass);
    };
  }, [grassGeometry, grassMaterial, scene, controls.count]);

  return (
    <>
      {/* <GrassSparkles scale={controls.patchSize} />
    

      <Butterfly position={[3, 0.5, 3]} scale={0.2} color="#ffffff" /> */}
    </>
  );
};

export { Grass };

useTexture.preload(grassHeightTextureAsset);
useTexture.preload(perlinNoiseImage);
