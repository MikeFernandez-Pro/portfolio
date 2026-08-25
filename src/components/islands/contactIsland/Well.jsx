import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, Instances, Instance } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import wellVertexShader from '#shaders/well/vertex.glsl';
import wellFragmentShader from '#shaders/well/fragment.glsl';
import fishVertexShader from '#shaders/fish/vertex.glsl';

import { useVoronoiPerlinTexture } from '#utils/packedTextures.js';

import fishModel from '#assets/models/island/fish.glb?url';

const isDebugActive = window.location.hash === '#debug';

// Water
const FOAM_COLOR = '#ffffff';
const OUTER_WATER_COLOR = '#0c2637';
const INNER_WATER_COLOR = '#26b0cf';
const INNER_CIRCLE_RADIUS = 0.067;
const INNER_CIRCLE_THICKNESS = 0.006;
const INNER_CIRCLE_OFFSET_X = -0.003;
const INNER_CIRCLE_OFFSET_Y = -0.023;
const OUTER_CIRCLE_RADIUS = 0.42;
const OUTER_CIRCLE_THICKNESS = 0.035;
const INNER_PERLIN_STRENGTH = 0.095;
const OUTER_PERLIN_STRENGTH = 0.03;

// Fishes
const FISHES_COLOR = '#00f6d0';
const FISHES_INTENSITY = 12.61;
const FISHES_SPEED = 0.5;
const BIG_FISH_AMPLITUDE = 0.88;
const SMALL_FISH_AMPLITUDE = 0.66;
const SMALL_FISH_OFFSET = 3;
// Max bend angle (radians) at the tail tip
const FISH_DEFORMATION_STRENGTH = 0.32;
const FISH_WIGGLE_SPEED = 7;

const Well = () => {
  const bigFishRef = useRef(null);
  const smallFishRef = useRef(null);
  const wellShaderMaterialRef = useRef(null);
  const fishShaderMaterialRef = useRef(null);

  const { nodes: fishNodes } = useGLTF(fishModel);

  const controls = useControls(
    'Well',
    {
      foamColor: {
        value: FOAM_COLOR,
        onChange: value => {
          if (wellShaderMaterialRef.current.uniforms) {
            wellShaderMaterialRef.current.uniforms.uFoamColor.value =
              new THREE.Color(value);
          }
        },
      },
      outerWaterColor: {
        value: OUTER_WATER_COLOR,
        onChange: value => {
          if (wellShaderMaterialRef.current.uniforms) {
            wellShaderMaterialRef.current.uniforms.uOuterWaterColor.value =
              new THREE.Color(value);
          }
        },
      },
      innerWaterColor: {
        value: INNER_WATER_COLOR,
        onChange: value => {
          if (wellShaderMaterialRef.current.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerWaterColor.value =
              new THREE.Color(value);
          }
        },
      },
      innerCircleRadius: {
        value: INNER_CIRCLE_RADIUS,
        min: 0,
        max: 0.7,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerCircleRadius.value =
              value;
          }
        },
      },
      innerCircleThickness: {
        value: INNER_CIRCLE_THICKNESS,
        min: 0,
        max: 0.3,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerCircleThickness.value =
              value;
          }
        },
      },
      outerCircleRadius: {
        value: OUTER_CIRCLE_RADIUS,
        min: 0,
        max: 1,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uOuterCircleRadius.value =
              value;
          }
        },
      },
      outerCircleThickness: {
        value: OUTER_CIRCLE_THICKNESS,
        min: 0,
        max: 0.3,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uOuterCircleThickness.value =
              value;
          }
        },
      },
      innerCircleOffsetX: {
        value: INNER_CIRCLE_OFFSET_X,
        min: -0.5,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerCircleOffset.value.x =
              value;
          }
        },
      },
      innerCircleOffsetY: {
        value: INNER_CIRCLE_OFFSET_Y,
        min: -0.5,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerCircleOffset.value.y =
              value;
          }
        },
      },
      perlinStrengthInner: {
        value: INNER_PERLIN_STRENGTH,
        min: 0,
        max: 0.2,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uInnerPerlinStrength.value =
              value;
          }
        },
      },
      perlinStrengthOuter: {
        value: OUTER_PERLIN_STRENGTH,
        min: 0,
        max: 0.2,
        step: 0.001,
        onChange: value => {
          if (wellShaderMaterialRef.current?.uniforms) {
            wellShaderMaterialRef.current.uniforms.uOuterPerlinStrength.value =
              value;
          }
        },
      },
      posX: { value: 15.45, min: 10, max: 20, step: 0.01 },
      posY: { value: -1.82, min: -5, max: 2, step: 0.01 },
      posZ: { value: 11.2, min: 6, max: 16, step: 0.01 },
      radius: { value: 1.48, min: 0.1, max: 5, step: 0.01 },
      fishColor: {
        value: FISHES_COLOR,
      },
      fishIntensity: {
        value: FISHES_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
      },
      fishMovementStrength: {
        value: 1,
        min: 0,
        max: 2,
        step: 0.01,
      },
      fishDeformationStrength: {
        value: FISH_DEFORMATION_STRENGTH,
        min: 0,
        max: 1.5,
        step: 0.01,
        onChange: value => {
          if (fishShaderMaterialRef.current?.uniforms) {
            fishShaderMaterialRef.current.uniforms.uDeformationStrength.value =
              value;
          }
        },
      },
      fishWiggleSpeed: {
        value: FISH_WIGGLE_SPEED,
        min: 0,
        max: 15,
        step: 0.1,
        onChange: value => {
          if (fishShaderMaterialRef.current?.uniforms) {
            fishShaderMaterialRef.current.uniforms.uWiggleSpeed.value = value;
          }
        },
      },
    },
    { collapsed: true }
  );

  const perlinNoiseTexture = useVoronoiPerlinTexture();

  // Stable identity: CSM resets every uniform to these values whenever the
  // uniforms prop changes reference, which would wipe the debug tweaks
  const wellUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPerlinNoise: { value: perlinNoiseTexture },
      uOuterWaterColor: { value: new THREE.Color(OUTER_WATER_COLOR) },
      uInnerWaterColor: { value: new THREE.Color(INNER_WATER_COLOR) },
      uFoamColor: { value: new THREE.Color(FOAM_COLOR) },
      uInnerCircleRadius: { value: INNER_CIRCLE_RADIUS },
      uInnerCircleThickness: { value: INNER_CIRCLE_THICKNESS },
      uInnerCircleOffset: {
        value: new THREE.Vector2(INNER_CIRCLE_OFFSET_X, INNER_CIRCLE_OFFSET_Y),
      },
      uOuterCircleRadius: { value: OUTER_CIRCLE_RADIUS },
      uOuterCircleThickness: { value: OUTER_CIRCLE_THICKNESS },
      uInnerPerlinStrength: { value: INNER_PERLIN_STRENGTH },
      uOuterPerlinStrength: { value: OUTER_PERLIN_STRENGTH },
    }),
    [perlinNoiseTexture]
  );

  // Same stable-identity rule as wellUniforms
  const fishUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uDeformationStrength: { value: FISH_DEFORMATION_STRENGTH },
      uWiggleSpeed: { value: FISH_WIGGLE_SPEED },
    }),
    []
  );

  useFrame(({ clock }) => {
    // Well
    wellShaderMaterialRef.current.uniforms.uTime.value = clock.elapsedTime;

    // Fish tail wiggle
    fishShaderMaterialRef.current.uniforms.uTime.value = clock.elapsedTime;

    // Big fish
    const bigAmplitude = BIG_FISH_AMPLITUDE * controls.fishMovementStrength;
    bigFishRef.current.rotation.y =
      -clock.elapsedTime * FISHES_SPEED - Math.PI / 2;
    bigFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * FISHES_SPEED) * bigAmplitude;
    bigFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * FISHES_SPEED) * bigAmplitude;

    // Small fish
    const smallAmplitude = SMALL_FISH_AMPLITUDE * controls.fishMovementStrength;
    smallFishRef.current.rotation.y =
      -clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET - Math.PI / 2;

    smallFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET) *
      smallAmplitude;
    smallFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET) *
      smallAmplitude;
  });

  return (
    <>
      <mesh
        name="Well"
        position={[controls.posX, controls.posY, controls.posZ]}
        rotation-x={-Math.PI / 2}
        scale={controls.radius}
      >
        <circleGeometry args={[1, 48]} />
        <CustomShaderMaterial
          ref={wellShaderMaterialRef}
          baseMaterial={THREE.MeshStandardMaterial}
          vertexShader={wellVertexShader}
          fragmentShader={wellFragmentShader}
          uniforms={wellUniforms}
          transparent={true}
        />
      </mesh>
      <Instances
        count={2}
        limit={2}
        range={2}
        position={[15.45, -2.11, 11.2]}
        geometry={fishNodes.Fish.geometry}
      >
        <CustomShaderMaterial
          ref={fishShaderMaterialRef}
          baseMaterial={THREE.MeshStandardMaterial}
          vertexShader={fishVertexShader}
          uniforms={fishUniforms}
          color={controls.fishColor}
          emissive={controls.fishColor}
          emissiveIntensity={controls.fishIntensity}
        />
        <Instance ref={bigFishRef} scale={0.089} />
        <Instance ref={smallFishRef} scale={0.0667} />
      </Instances>
    </>
  );
};

useGLTF.preload(fishModel);

export { Well };
