import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';

import voronoiImage from '#assets/textures/voronoi.jpg';
import vertexShader from '#shaders/character/vertex.glsl';
import fragmentShader from '#shaders/character/fragment.glsl';

const CHARACTER_MATERIAL_NAME = 'knight';
const BOUNDS_MIN = new THREE.Vector3(-3.34, 0, -2.41);
const BOUNDS_MAX = new THREE.Vector3(3.34, 5.94, 0.73);

const useCharacterMaterial = characterScene => {
  const respawnTimelineRef = useRef(null);

  const voronoiTexture = useTexture(voronoiImage, texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.colorSpace = THREE.NoColorSpace;
  });

  useEffect(() => {
    if (!characterScene) {
      return;
    }

    const characterMesh = characterScene.getObjectByName(
      CHARACTER_MATERIAL_NAME
    );

    if (!characterMesh || !voronoiTexture) {
      return;
    }

    new CustomShaderMaterial({
      baseMaterial: characterMesh.material,
      uniforms: {
        uVoronoiTexture: { value: voronoiTexture },
        uBoundsMin: { value: BOUNDS_MIN },
        uBoundsMax: { value: BOUNDS_MAX },
        uColor: { value: new THREE.Color('#ff6500') },
        uIntensity: { value: 39.0 },
        uRepeat: { value: 3.2 },
        uProgress: { value: 1.0 },
        uRespawn: { value: 0.5 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      tonemapped: false,
      side: THREE.DoubleSide,
    });

    const respawnHandler = e => {
      if (e.key === 'p') {
        const tl = gsap.timeline();
        tl.set(characterMesh.material.uniforms.uRespawn, { value: 0 });
        tl.fromTo(
          characterMesh.material.uniforms.uProgress,
          { value: 0 },
          { value: 1, duration: 1.5, ease: 'power2.in' }
        );
        tl.to(characterMesh.material.uniforms.uRespawn, {
          value: 1,
          duration: 0.5,
          ease: 'power2.out',
        });

        respawnTimelineRef.current = tl;
      }
    };

    window.addEventListener('keydown', respawnHandler);

    return () => {
      if (respawnTimelineRef.current) {
        respawnTimelineRef.current.kill();
        respawnTimelineRef.current = null;
      }
      window.removeEventListener('keydown', respawnHandler);
    };
  }, [characterScene, voronoiTexture]);
};

export { useCharacterMaterial };
