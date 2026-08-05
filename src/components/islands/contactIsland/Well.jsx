import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useTexture, Instances, Instance } from '@react-three/drei';
import CustomShaderMaterial from 'three-custom-shader-material';
import { useControls } from 'leva';
import * as THREE from 'three';

import wellVertexShader from '#shaders/well/vertex.glsl';
import wellFragmentShader from '#shaders/well/fragment.glsl';

import perlinNoiseImage from '#assets/textures/perlin.png';

import fishModel from '#assets/models/island/fish.glb?url';

const isDebugActive = window.location.hash === '#debug';

// Water
const FOAM_COLOR = '#61bdff';
const OUTER_WATER_COLOR = '#0b2e46';
const INNER_WATER_COLOR = '#26b0cf';

// Fishes
const FISHES_COLOR = '#00f6d0';
const FISHES_INTENSITY = 12.61;
const FISHES_SPEED = 0.5;
const BIG_FISH_AMPLITUDE = 0.88;
const SMALL_FISH_AMPLITUDE = 0.66;
const SMALL_FISH_OFFSET = 3;

const Well = props => {
  const { islandNodes } = props;

  const bigFishRef = useRef(null);
  const smallFishRef = useRef(null);
  const wellShaderMaterialRef = useRef(null);

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
      fishColor: {
        value: FISHES_COLOR,
      },
      fishIntensity: {
        value: FISHES_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
      },
    },
    { collapsed: true }
  );

  const perlinNoiseTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  useFrame(({ clock }) => {
    // Well
    wellShaderMaterialRef.current.uniforms.uTime.value = clock.elapsedTime;

    // Big fish
    bigFishRef.current.rotation.y =
      -clock.elapsedTime * FISHES_SPEED - Math.PI / 2;
    bigFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * FISHES_SPEED) * BIG_FISH_AMPLITUDE;
    bigFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * FISHES_SPEED) * BIG_FISH_AMPLITUDE;

    // Small fish
    smallFishRef.current.rotation.y =
      -clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET - Math.PI / 2;

    smallFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET) *
      SMALL_FISH_AMPLITUDE;
    smallFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * FISHES_SPEED + SMALL_FISH_OFFSET) *
      SMALL_FISH_AMPLITUDE;
  });

  return (
    <>
      <skinnedMesh
        name="Well"
        geometry={islandNodes.island_7.geometry}
        skeleton={islandNodes.island_7.skeleton}
        morphTargetDictionary={islandNodes.island_7.morphTargetDictionary}
        morphTargetInfluences={islandNodes.island_7.morphTargetInfluences}
      >
        <CustomShaderMaterial
          ref={wellShaderMaterialRef}
          baseMaterial={THREE.MeshStandardMaterial}
          vertexShader={wellVertexShader}
          fragmentShader={wellFragmentShader}
          uniforms={{
            uTime: { value: 0 },
            uPerlinNoise: { value: perlinNoiseTexture },
            uOuterWaterColor: { value: new THREE.Color('#0b2e46') },
            uInnerWaterColor: { value: new THREE.Color('#26b0cf') },
            uFoamColor: { value: new THREE.Color('#61ade4') },
          }}
          transparent={true}
        />
      </skinnedMesh>
      <Instances
        count={2}
        limit={2}
        range={2}
        position={[15.42, -2.11, 11.15]}
        geometry={fishNodes.Fish.geometry}
      >
        <meshStandardMaterial
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
useTexture.preload(perlinNoiseImage);

export { Well };
