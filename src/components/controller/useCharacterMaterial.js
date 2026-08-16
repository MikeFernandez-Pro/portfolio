import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import { useTexture } from '@react-three/drei';
import gsap from 'gsap';

import voronoiImage from '#assets/textures/customVoronoi.png';
import vertexShader from '#shaders/character/vertex.glsl';
import fragmentShader from '#shaders/character/fragment.glsl';
import { patchIslandPointLights } from '#islands/common/islandPointLights.js';

const CHARACTER_MATERIAL_NAME = 'knight';
const BOUNDS_MIN = new THREE.Vector3(-3.34, 0, -2.41);
const BOUNDS_MAX = new THREE.Vector3(3.34, 5.94, 0.73);

const useCharacterMaterial = characterScene => {
  const respawnTimelineRef = useRef(null);
  const characterMeshRef = useRef(null);

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

    characterMeshRef.current = characterMesh;

    new CustomShaderMaterial({
      baseMaterial: characterMesh.material,
      uniforms: {
        uVoronoiTexture: { value: voronoiTexture },
        uBoundsMin: { value: BOUNDS_MIN },
        uBoundsMax: { value: BOUNDS_MAX },
        uColor: { value: new THREE.Color('#ff6500') },
        uIntensity: { value: 39.0 },
        uRepeat: { value: 3.2 },
        uProgress: { value: 0 },
        uRespawn: { value: 1 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      tonemapped: false,
      side: THREE.DoubleSide,
    });

    // CSM v6 mutates the base material in place; chain the fake island
    // point lights on top so torches, lanterns and portals also light the
    // character as it walks by
    patchIslandPointLights(characterMesh.material);

    return () => {
      if (respawnTimelineRef.current) {
        respawnTimelineRef.current.kill();
        respawnTimelineRef.current = null;
      }
    };
  }, [characterScene, voronoiTexture]);

  const playRespawn = useCallback(({ onStart, onComplete } = {}) => {
    const mesh = characterMeshRef.current;
    if (!mesh) return;

    if (respawnTimelineRef.current) {
      respawnTimelineRef.current.kill();
      respawnTimelineRef.current = null;
    }

    const tl = gsap.timeline({ onStart, onComplete });
    tl.set(mesh.material.uniforms.uRespawn, { value: 0 });
    tl.fromTo(
      mesh.material.uniforms.uProgress,
      { value: 0 },
      { value: 1, duration: 1, ease: 'power2.out' }
    );
    tl.to(mesh.material.uniforms.uRespawn, {
      value: 1,
      duration: 0.5,
      ease: 'power2.in',
    });

    respawnTimelineRef.current = tl;
  }, []);

  return { playRespawn };
};

export { useCharacterMaterial };
