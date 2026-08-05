import { useMemo, useEffect, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Circle, useTexture } from '@react-three/drei';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';

import portalVertexShader from '#shaders/portal/vertex.glsl';
import portalFragmentShader from '#shaders/portal/fragment.glsl';

import PortalAudio from '#assets/sounds/portal.mp3';

import portalProjectImage from '#assets/textures/portal-project.webp';
import seaProjectImage from '#assets/textures/sea-project.webp';
import halloweenProjectImage from '#assets/textures/halloween-project.webp';
import perlinNoiseImage from '#assets/textures/perlin.png';

const PORTAL_POSITION = new THREE.Vector3(-16.12, 6.95, -37.7);

const ProjectsPortals = props => {
  const { island } = props;

  const portal = island.nodes.portal;

  const portalSoundEffect = useMemo(
    () =>
      new Howl({
        src: [PortalAudio],
        autoplay: false,
        loop: true,
        volume: 0,
      }),
    [PortalAudio]
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

  useEffect(() => {
    const portalScaleUpAnimation = gsap.fromTo(
      portalShaderMaterial.uniforms.uSize,
      { value: 0 },
      {
        value: 0.5,
        duration: 0.5,
        paused: true,
      }
    );

    // Retrieve current activated plate and update shader texture accordingly
    const unsubActivaPlate = useStore.subscribe(
      state => state.activePlate,
      activePlate => {
        if (activePlate) {
          portalShaderMaterial.uniforms.uTextureMap.value =
            portalsTextures[activePlate];
          portalScaleUpAnimation.restart();
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
      portalScaleUpAnimation?.kill();
    };
  }, [portalShaderMaterial, portalSoundEffect, portalsTextures]);

  useFrame(({ clock }, delta) => {
    portal.rotation.y += delta * 0.15;
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

useTexture.preload({
  portalProjectImage,
  seaProjectImage,
  halloweenProjectImage,
  perlinNoiseImage,
});

export { ProjectsPortals };
