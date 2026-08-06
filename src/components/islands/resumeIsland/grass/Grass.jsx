import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { Butterfly } from './Butterfly.jsx';
import { useStore } from '#store/ZustandStorage.jsx';

import grassFragmentShader from '#shaders/grass/fragment.glsl';
import grassVertexShader from '#shaders/grass/vertex.glsl';

import grassHeightTextureAsset from '#assets/textures/grass-height-map.webp';
import perlinNoiseImage from '#assets/textures/perlin.png';

const Grass = () => {
  const grassRef = useRef(null);

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
      flowerWidth: { value: 0.106, min: 0, max: 0.5, step: 0.001 },
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
      scale: { value: 0.04, min: 0, max: 0.2, step: 0.001 },
      strength: { value: 1.0, min: -5, max: 5, step: 0.01 },
      speed: { value: 0.13, min: 0, max: 5, step: 0.01 },
    },
    { collapsed: true }
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
          uHeightDataTexture: { value: grassHeightTexture },
          uPerlinNoiseTexture: { value: perlinNoiseTexture },
          uSquareShape: { value: controls.squared },
          uPositionX: { value: 0 },
          uPositionZ: { value: 0 },
          uPlayerPosition: { value: new THREE.Vector3(0, 0, 0) },

          uWindScale: { value: windControls.scale },
          uWindStrength: { value: windControls.strength },
          uWindSpeed: { value: windControls.speed },
        },
        vertexShader: grassVertexShader,
        fragmentShader: grassFragmentShader,
        side: THREE.FrontSide,
      }),
    [controls, windControls, grassHeightTexture]
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
    grassMaterial.uniforms.uHeightDataTexture.value = grassHeightTexture;
    grassMaterial.uniforms.uGrassParameters.value.x = controls.segmentsCount;
    grassMaterial.uniforms.uGrassParameters.value.y = controls.patchSize;
    grassMaterial.uniforms.uGrassParameters.value.z = controls.width;
    grassMaterial.uniforms.uGrassParameters.value.w = controls.height;
    grassMaterial.uniforms.uSquareShape.value = controls.squared;
    grassMaterial.uniforms.uWindScale.value = windControls.scale;
    grassMaterial.uniforms.uWindStrength.value = windControls.strength;
    grassMaterial.uniforms.uWindSpeed.value = windControls.speed;
    grassMaterial.uniforms.uPositionX.value = controls.position[0];
    grassMaterial.uniforms.uPositionZ.value = controls.position[2];
  }, [controls, windControls, grassHeightTexture, grassMaterial]);

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
  useFrame(({ clock }) => {
    grassMaterial.uniforms.uTime.value = clock.elapsedTime;
    if (grassRef.current) {
      grassRef.current.position.set(
        controls.position[0],
        controls.position[1],
        controls.position[2]
      );
    }
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
