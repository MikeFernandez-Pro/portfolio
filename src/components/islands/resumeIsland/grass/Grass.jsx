import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { Butterfly } from './Butterfly.jsx';
import { cloudShadowUniforms } from '#environment/CloudShadows.jsx';
import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import grassFragmentShader from '#shaders/grass/fragment.glsl';
import grassVertexShader from '#shaders/grass/vertex.glsl';

import grassHeightTextureAsset from '#assets/textures/grass-height-map.webp';
import perlinNoiseImage from '#assets/textures/perlin.png';

// Trample map: a small 2D canvas mapped onto the patch XZ records where the
// character walked; it fades to black a little every frame, so crushed
// blades ease back up instead of snapping once out of the live radius
const TRAMPLE_SIZE = 128;
const trampleCanvas = document.createElement('canvas');
trampleCanvas.width = TRAMPLE_SIZE;
trampleCanvas.height = TRAMPLE_SIZE;
const trampleContext = trampleCanvas.getContext('2d');
trampleContext.fillRect(0, 0, TRAMPLE_SIZE, TRAMPLE_SIZE);

// Live preview on screen, toggled from the Repulse debug folder (the id
// dance keeps HMR from stacking duplicates)
if (!IS_MOBILE_DEVICE) {
  trampleCanvas.id = 'grass-trample-debug';
  document.getElementById('grass-trample-debug')?.remove();
  trampleCanvas.style.position = 'fixed';
  trampleCanvas.style.top = '0';
  trampleCanvas.style.left = '0';
  trampleCanvas.style.width = '256px';
  trampleCanvas.style.height = '256px';
  trampleCanvas.style.zIndex = 10;
  trampleCanvas.style.pointerEvents = 'none';
  document.body.append(trampleCanvas);
}

// Radial glow stamped at the character position, drawn once procedurally.
// Kept tight (steep falloff): the shader's smoothstep amplifies faint
// edges, so a soft gradient would read much larger than the glow itself.
const glowCanvas = document.createElement('canvas');
glowCanvas.width = 64;
glowCanvas.height = 64;
const glowContext = glowCanvas.getContext('2d');
const glowGradient = glowContext.createRadialGradient(32, 32, 0, 32, 32, 32);
glowGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.85)');
glowGradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.25)');
glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
glowContext.fillStyle = glowGradient;
glowContext.fillRect(0, 0, 64, 64);

const trampleTexture = new THREE.CanvasTexture(trampleCanvas);
trampleTexture.colorSpace = THREE.NoColorSpace;
// The shader samples with the height map UV convention (v = 0 at the top
// row we draw at), no vertical flip wanted
trampleTexture.flipY = false;
// Updated every frame: skip the mipmap regeneration, sample linearly
trampleTexture.generateMipmaps = false;
trampleTexture.minFilter = THREE.LinearFilter;
trampleTexture.magFilter = THREE.LinearFilter;

const Grass = () => {
  const grassRef = useRef(null);

  // Previous grounded state, to detect the landing frame after a jump
  const wasGroundedRef = useRef(true);

  // Controls
  const controls = useControls(
    'Grass',
    {
      colorBase: '#22651e', //297a25
      colorTop: '#49d57c', //4cf288
      redTipColor: '#ee3055',
      redTipLength: { value: 0.3, min: 0, max: 1, step: 0.01 },
      flowerAmount: { value: 0.0035, min: 0, max: 0.05, step: 0.0001 },
      flowerHeight: { value: 0.447, min: 0, max: 1.5, step: 0.001 },
      flowerWidth: { value: 0.1, min: 0, max: 0.5, step: 0.001 },
      flowerStemColor: '#49d57c',
      count: { value: 16 * 5000, min: 0, max: 16 * 50000, step: 1 },
      segmentsCount: { value: 3, min: 1, max: 10, step: 1 },
      patchSize: { value: 11.7, min: 11, max: 13, step: 0.001 },
      width: { value: 0.08, min: 0, max: 0.2, step: 0.001 },
      height: { value: 0.36, min: 0, max: 1, step: 0.001 },
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
      // crushes the blades
      trailDuration: { value: 0.6, min: 0.1, max: 6, step: 0.05 },
      trailRadius: { value: 0.04, min: 0.002, max: 0.5, step: 0.001 },
      trampleStrength: { value: 1, min: 0, max: 1, step: 0.01 },
      showTrailMap: {
        value: false,
        onChange: v => {
          trampleCanvas.style.display = v ? 'block' : 'none';
        },
      },
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
      new THREE.ShaderMaterial({
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
          uFlowerStemColor: {
            value: new THREE.Color(controls.flowerStemColor),
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
    grassMaterial.uniforms.uFlowerStemColor.value = new THREE.Color(
      controls.flowerStemColor
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

    // The whole trample pipeline (canvas work + texture upload) is off on
    // mobile, where the shader compiles without USE_TRAMPLE anyway
    if (IS_MOBILE_DEVICE) {
      return;
    }

    // Trample map: fade the previous frames toward black, then stamp the
    // glow at the character position (same patch mapping as the height map
    // in the vertex shader). The fade alpha is derived from the trail
    // duration so the map decays to ~5% in trailDuration seconds at any
    // framerate.
    trampleContext.globalCompositeOperation = 'source-over';
    trampleContext.globalAlpha =
      1 - Math.pow(0.05, delta / repulseControls.trailDuration);
    trampleContext.fillStyle = '#000000';
    trampleContext.fillRect(0, 0, TRAMPLE_SIZE, TRAMPLE_SIZE);

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
        const glowSize =
          repulseControls.trailRadius * TRAMPLE_SIZE * (justLanded ? 1.5 : 1);
        trampleContext.globalCompositeOperation = 'lighten';
        // Full alpha: standing still keeps the blades pressed down
        trampleContext.globalAlpha = 1;
        trampleContext.drawImage(
          glowCanvas,
          u * TRAMPLE_SIZE - glowSize * 0.5,
          v * TRAMPLE_SIZE - glowSize * 0.5,
          glowSize,
          glowSize
        );
      }
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
