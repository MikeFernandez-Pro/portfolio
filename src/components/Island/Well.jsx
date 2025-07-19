import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGLTF,
  useTexture,
  useAnimations,
  Instances,
  Instance,
} from '@react-three/drei';
import { useControls } from 'leva';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import perlinNoiseImage from '/textures/perlin.png';

import wellVertexShader from '../../shaders/well/vertex.glsl';
import wellFragmentShader from '../../shaders/well/fragment.glsl';

// Animated Fish Pack by Quaternius
// https://quaternius.com/packs/animatedfish.html
// CC0 1.0 Universal (CC0 1.0)
// Public Domain Dedication
// https://creativecommons.org/publicdomain/zero/1.0/
import fishModel from '/models/island/fish.glb?url';

const isDebugActive = window.location.hash === '#debug';

const fishesSpeed = 0.5;
const bigFishAmplitude = 0.4;
const smallFishAmplitude = 0.3;
const smallFishOffset = 3;

const Well = props => {
  const { island } = props;

  const bigFishRef = useRef(null);
  const smallFishRef = useRef(null);

  const { nodes } = useGLTF(fishModel);

  const controls = useControls('Well', {
    foamColor: {
      value: '#61bdff',
      onChange: value => {
        if (wellShaderMaterial.uniforms) {
          wellShaderMaterial.uniforms.uFoamColor.value = new THREE.Color(value);
        }
      },
    },
    outerWaterColor: {
      value: '#0b2e46',
      onChange: value => {
        if (wellShaderMaterial.uniforms) {
          wellShaderMaterial.uniforms.uOuterWaterColor.value = new THREE.Color(
            value
          );
        }
      },
    },
    innerWaterColor: {
      value: '#26b0cf',
      onChange: value => {
        if (wellShaderMaterial.uniforms) {
          wellShaderMaterial.uniforms.uInnerWaterColor.value = new THREE.Color(
            value
          );
        }
      },
    },
    fishColor: {
      value: '#00f6d0',
    },
    fishIntensity: {
      min: 0,
      max: 20,
      step: 0.01,
      value: 8.7,
    },
  });

  const perlinNoiseTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  const wellShaderMaterial = useMemo(
    () =>
      new CustomShaderMaterial({
        baseMaterial: THREE.MeshStandardMaterial,
        vertexShader: wellVertexShader,
        fragmentShader: wellFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uPerlinNoise: { value: perlinNoiseTexture },
          uOuterWaterColor: { value: new THREE.Color('#0b2e46') },
          uInnerWaterColor: { value: new THREE.Color('#26b0cf') },
          uFoamColor: { value: new THREE.Color('#61ade4') },
        },
        transparent: true,
      }),
    []
  );

  const fishMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(controls.fishColor),
        emissive: new THREE.Color(controls.fishColor),
        emissiveIntensity: controls.fishIntensity,
      }),
    [controls.fishColor, controls.fishIntensity]
  );

  useEffect(() => {
    const well = island.scene.children[0].children[0].children[6];

    well.material?.dispose();
    well.material = wellShaderMaterial;
  }, [wellShaderMaterial]);

  useFrame(({ clock }) => {
    // Well
    wellShaderMaterial.uniforms.uTime.value = clock.elapsedTime;

    // Big fish
    bigFishRef.current.rotation.y =
      -clock.elapsedTime * fishesSpeed - Math.PI / 2;
    bigFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * fishesSpeed) * bigFishAmplitude;
    bigFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * fishesSpeed) * bigFishAmplitude;

    // Small fish
    smallFishRef.current.rotation.y =
      -clock.elapsedTime * fishesSpeed + smallFishOffset - Math.PI / 2;

    smallFishRef.current.position.x =
      Math.sin(-clock.elapsedTime * fishesSpeed + smallFishOffset) *
      smallFishAmplitude;
    smallFishRef.current.position.z =
      Math.cos(-clock.elapsedTime * fishesSpeed + smallFishOffset) *
      smallFishAmplitude;
  });

  return (
    <Instances
      count={2}
      limit={2}
      range={2}
      position={[5.59, 1.3, -9.98]}
      geometry={nodes.Fish.geometry}
      material={fishMaterial}
    >
      <Instance ref={bigFishRef} scale={0.04} />
      <Instance ref={smallFishRef} scale={0.03} />
    </Instances>
  );
};

useGLTF.preload(fishModel);

export { Well };
