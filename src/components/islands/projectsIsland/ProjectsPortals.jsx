import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Circle, useTexture } from '@react-three/drei';
import { useStore } from '#store/ZustandStorage.jsx';
import gsap from 'gsap';
import * as THREE from 'three';

import portalVertexShader from '#shaders/portal/vertex.glsl';
import portalFragmentShader from '#shaders/portal/fragment.glsl';

import portalSound from '/sounds/portalSoundEffect.mp3';

import portalProjectImage from '/textures/portalProjectTexture.webp';
import seaProjectImage from '/textures/seaProjectTexture.webp';
import halloweenProjectImage from '/textures/halloweenProjectTexture.webp';
import perlinNoiseImage from '/textures/perlin.png';

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7);

const ProjectsPortals = () => {
  // Sound Effect
  const portalSoundEffect = useMemo(
    () =>
      new Howl({
        src: [portalSound],
        autoplay: false,
        loop: true,
        volume: 0,
      }),
    [portalSound]
  );

  // Textures
  const portalsTextures = useMemo(
    () => ({
      portalPlate: useLoader(THREE.TextureLoader, portalProjectImage),
      seaPlate: useLoader(THREE.TextureLoader, seaProjectImage),
      halloweenPlate: useLoader(THREE.TextureLoader, halloweenProjectImage),
    }),
    [portalProjectImage, seaProjectImage, halloweenProjectImage]
  );

  const perlinTexture = useTexture(perlinNoiseImage, texture => {
    texture.colorSpace = THREE.NoColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });

  // Material
  const portalShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: portalVertexShader,
        fragmentShader: portalFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSize: { value: -0.2 },
          uTextureMap: { value: undefined },
          uPerlinTexture: { value: perlinTexture },
        },
        transparent: true,
      }),
    [portalVertexShader, portalFragmentShader, perlinTexture]
  );

  // Animation
  const portalSizeAnimation = useMemo(
    () =>
      gsap.fromTo(
        portalShaderMaterial.uniforms.uSize,
        { value: 0 },
        {
          value: 0.5,
          duration: 0.5,
          paused: true,
        }
      ),
    [portalShaderMaterial]
  );

  useEffect(() => {
    // Retrieve current activated plate and update shader texture accordingly
    const unsubActivaPlate = useStore.subscribe(
      state => state.activePlate,
      activePlate => {
        if (activePlate) {
          portalShaderMaterial.uniforms.uTextureMap.value =
            portalsTextures[activePlate];
          portalSizeAnimation.restart();
          // Activate Portal Sound Effect Only Once
          portalSoundEffect.play();
        }
      }
    );

    // Update portal sound effect volume based on character position
    const unsubCharacterPosition = useStore.subscribe(
      state => state.characterPosition,
      characterPosition => {
        if (characterPosition) {
          portalSoundEffect.volume(
            PORTAL_POSITION.distanceTo(characterPosition) < 13
              ? Math.min(
                  (1 / PORTAL_POSITION.distanceTo(characterPosition)) * 2,
                  0.8
                ) * 0.7
              : 0
          );
        }
      }
    );

    // Remove subscriptions on unmount
    return () => {
      unsubActivaPlate();
      unsubCharacterPosition();
      portalSizeAnimation?.kill();
    };
  }, [
    portalShaderMaterial,
    portalSizeAnimation,
    portalSoundEffect,
    portalsTextures,
  ]);

  useFrame(({ clock }) => {
    portalShaderMaterial.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <Circle
      args={[0.8, 32]}
      material={portalShaderMaterial}
      position={[-16.12, 6.95, -37.7]}
    />
  );
};

export default ProjectsPortals;
