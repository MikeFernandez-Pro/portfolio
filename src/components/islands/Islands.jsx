import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { LanternsAndHome } from '#islands/common/LanternsAndHome';
import { ContactIsland } from '#islands/contactIsland/ContactIsland';
import { SkillsIsland } from '#islands/skillsIsland/SkillsIsland';
import { ResumeIsland } from '#islands/resumeIsland/ResumeIsland';
import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import PressurePlateSoundEffect from '#assets/sounds/pressure-plate.mp3';

import islandModel from '#assets/models/island/island.glb?url';

const ISLAND_POSITION = new THREE.Vector3(-1.35, 2.25, -15);

/**
 * Sounds Effects
 */
var pressurePlateSoundEffect = new Howl({
  src: [PressurePlateSoundEffect],
  autoplay: false,
  volume: 0.09,
});

const Islands = () => {
  //   /**
  //    * Islands initialization
  //    */
  const island = useMemo(() => {
    const island = useGLTF(islandModel);

    island.scene.traverse(child => {
      if (child.isMesh && child.material.isMeshStandardMaterial) {
        child.material.name === 'islandTexture' && !IS_MOBILE_DEVICE
          ? (child.receiveShadow = true)
          : (child.material.toneMapped = false);

        if (child.material.name === 'islandTexture') {
          child.material.roughness = 1;
        }
        child.material.envMapIntensity = 1;
      }
    });

    return island;
  }, []);

  useFrame((state, delta) => {
    // Cauldron Bone
    island.scene.children[0].children[3].rotation.y += delta * 0.5;
    // Margic Portal Bone
    island.scene.children[0].children[4].rotation.y += delta * 0.15;
  });

  const islandAnimations = useAnimations(island.animations, island.scene);

  // useLayoutEffect(() => {
  island.materials.islandTexture.aoMapIntensity = 1;

  // island.materials.portalPlate.emissiveIntensity = portalPlate.emissiveIntensity;
  island.materials.portalPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.halloweenPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.halloweenPlate.emissiveIntensity = 0;

  if (IS_MOBILE_DEVICE) island.materials.controls.opacity = 0;

  /**
   * Islands Animations Activation
   */
  useLayoutEffect(() => {
    /**
     * Animations
     */

    islandAnimations.actions['details'].play();

    /**
     * Storage Subscriptions
     */

    // Subscribe to activePlate zustand store state
    const unsubActivePlate = useStore.subscribe(
      state => state.activePlate,
      (activePlate, prevPlate) => {
        // plate emissive intensity animation
        gsap.to(island.materials[activePlate], {
          duration: 0.2,
          emissiveIntensity: 3,
        });
        if (prevPlate)
          gsap.to(island.materials[prevPlate], {
            duration: 0,
            emissiveIntensity: 0,
          });

        // plate sound effect
        pressurePlateSoundEffect.seek(0);
        pressurePlateSoundEffect.play();
      }
    );

    // Clear animations, interval and subscriptions on unmount
    return () => {
      unsubActivePlate();
    };
  }, []);

  return (
    <>
      <primitive
        object={island.scene}
        scale={0.45}
        position={ISLAND_POSITION}
      />
      <LanternsAndHome island={island} />

      <ContactIsland island={island} islandAnimations={islandAnimations} />
      <SkillsIsland island={island} />
      <ResumeIsland island={island} />
    </>
  );
};

useGLTF.preload(islandModel);

export default Islands;
