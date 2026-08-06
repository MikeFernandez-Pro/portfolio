import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { useControls } from 'leva';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';

import voronoiImage from '#assets/textures/customVoronoi.png';
import perlinNoiseImage from '#assets/textures/perlin.png';
import vertexShader from '#shaders/forgeLava/vertex.glsl';
import fragmentShader from '#shaders/forgeLava/fragment.glsl';

const LAVA_DEFAULTS = {
  posX: -7.59,
  posY: 1.39,
  posZ: -14.13,
  rotationY: -0.74,
  scaleX: 0.9,
  scaleY: 0.7,
  size: 1,
  speed: 0.06,  
  crustColor: '#290d07',
  glowColor: '#f47053',
  intensity: 17.58,
  contrast: 1.5,
  borderThicknessX: 0.05,
  borderThicknessY: 0.09,
  perlinNoiseStrength: 0.07,
};

/**
 * Standalone lava plane replacing the GLB lava mesh (island_6, hidden).
 * Flat by default (rotated -90° on X), spun around Y via the Leva control.
 */
const ForgeLavaPlane = () => {
  const uniformsRef = useRef(null);

  const [voronoiTexture, perlinNoiseTexture] = useTexture(
    [voronoiImage, perlinNoiseImage],
    textures => {
      textures.forEach(texture => {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.colorSpace = THREE.NoColorSpace;
      });
    }
  );

  const lavaMaterial = useMemo(() => {
    const material = new CustomShaderMaterial({
      baseMaterial: new THREE.MeshStandardMaterial(),
      uniforms: {
        uVoronoiTexture: { value: voronoiTexture },
        uPerlinNoise: { value: perlinNoiseTexture },
        uTime: { value: 0 },
        uSize: { value: LAVA_DEFAULTS.size },
        uSpeed: { value: LAVA_DEFAULTS.speed },
        uCrustColor: { value: new THREE.Color(LAVA_DEFAULTS.crustColor) },
        uGlowColor: { value: new THREE.Color(LAVA_DEFAULTS.glowColor) },
        uIntensity: { value: LAVA_DEFAULTS.intensity },
        uContrast: { value: LAVA_DEFAULTS.contrast },
        uBorderThicknessX: { value: LAVA_DEFAULTS.borderThicknessX },
        uBorderThicknessY: { value: LAVA_DEFAULTS.borderThicknessY },
        uPerlinNoiseStrength: { value: LAVA_DEFAULTS.perlinNoiseStrength },
      },
      vertexShader,
      fragmentShader,
    });

    uniformsRef.current = material.uniforms;

    return material;
  }, [voronoiTexture, perlinNoiseTexture]);

  const { posX, posY, posZ, rotationY, scaleX, scaleY } = useControls(
    'ForgeLava',
    {
      posX: {
        value: LAVA_DEFAULTS.posX,
        min: Math.floor(LAVA_DEFAULTS.posX),
        max: Math.ceil(LAVA_DEFAULTS.posX),
        step: 0.01,
      },
      posY: {
        value: LAVA_DEFAULTS.posY,
        min: Math.floor(LAVA_DEFAULTS.posY),
        max: Math.ceil(LAVA_DEFAULTS.posY),
        step: 0.01,
      },
      posZ: {
        value: LAVA_DEFAULTS.posZ,
        min: Math.floor(LAVA_DEFAULTS.posZ),
        max: Math.ceil(LAVA_DEFAULTS.posZ),
        step: 0.01,
      },
      rotationY: {
        value: LAVA_DEFAULTS.rotationY,
        min: -Math.PI,
        max: Math.PI,
        step: 0.01,
      },
      scaleX: {
        value: LAVA_DEFAULTS.scaleX,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
      scaleY: {
        value: LAVA_DEFAULTS.scaleY,
        min: 0.1,
        max: 20,
        step: 0.1,
      },
      size: {
        value: LAVA_DEFAULTS.size,
        min: 0.01,
        max: 10,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uSize.value = value;
        },
      },
      speed: {
        value: LAVA_DEFAULTS.speed,
        min: 0,
        max: 2,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uSpeed.value = value;
        },
      },
      crustColor: {
        value: LAVA_DEFAULTS.crustColor,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uCrustColor.value.set(value);
        },
      },
      glowColor: {
        value: LAVA_DEFAULTS.glowColor,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uGlowColor.value.set(value);
        },
      },
      intensity: {
        value: LAVA_DEFAULTS.intensity,
        min: 0,
        max: 30,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uIntensity.value = value;
        },
      },
      contrast: {
        value: LAVA_DEFAULTS.contrast,
        min: 0.1,
        max: 8,
        step: 0.1,
        onChange: value => {
          if (uniformsRef.current) uniformsRef.current.uContrast.value = value;
        },
      },
      borderThicknessX: {
        value: LAVA_DEFAULTS.borderThicknessX,
        min: 0,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uBorderThicknessX.value = value;
        },
      },
      borderThicknessY: {
        value: LAVA_DEFAULTS.borderThicknessY,
        min: 0,
        max: 0.5,
        step: 0.001,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uBorderThicknessY.value = value;
        },
      },
      perlinNoiseStrength: {
        value: LAVA_DEFAULTS.perlinNoiseStrength,
        min: 0,
        max: 5,
        step: 0.01,
        onChange: value => {
          if (uniformsRef.current)
            uniformsRef.current.uPerlinNoiseStrength.value = value;
        },
      },
    },
    { collapsed: true }
  );

  useFrame((_, delta) => {
    if (uniformsRef.current) {
      uniformsRef.current.uTime.value += delta;
    }
  });

  return (
    <group
      position={[posX, posY, posZ]}
      rotation-y={rotationY}
      scale={[scaleX, 1, scaleY]}
    >
      <mesh rotation-x={-Math.PI / 2} material={lavaMaterial}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
};

export { ForgeLavaPlane };
