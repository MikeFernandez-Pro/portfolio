import { useGLTF, useAnimations } from '@react-three/drei';
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';

import gsap from 'gsap';
import { useStore } from '../store/ZustandStorage.jsx';
import MagicLetters from './MagicLetters';
import SleepText from './SleepText';
import { useFrame } from '@react-three/fiber';
import { Howl } from 'howler';
import { IS_MOBILE_DEVICE } from '../utils/utils.js';
import { CountriesFlags } from './Island/CountriesFlags';
import islandModel from '/models/island/island.glb?url';
import { LanternsAndHome } from './Island/LanternsAndHome';
import { Well } from './Island/Well';
import { MagicBooks } from './Island/MagicBooks';
import Forge from './Island/Forge';

const ISLAND_POSITION = new THREE.Vector3(-1.35, 2.25, -15);
const MAGIC_GLYPH_SOUND_VOLUME = 0.15;

/**
 * Sounds Effects
 */
var pressurePlatesSoundEffect = new Howl({
  src: ['/sounds/pressurePlatesSoundEffect.mp3'],
  autoplay: false,
  volume: 0.09,
});

var magicGlyphSoundEffect = new Howl({
  src: ['/sounds/magicGlyphSoundEffect.mp3'],
  autoplay: false,
  volume: 0.15,
});

const Island = () => {
  const magicGlyphActivationRef = useRef(false);

  //   /**
  //    * Island initialization
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
    if (magicGlyphActivationRef.current) {
      // Magic Glyphs Bones
      island.scene.children[0].children[5].rotation.y += delta;
      island.scene.children[0].children[6].rotation.y -= delta;
    }
  });

  const islandAnimations = useAnimations(island.animations, island.scene);

  // useLayoutEffect(() => {
  island.materials.islandTexture.aoMapIntensity = 1;
  island.materials.magicPortal.emissive = new THREE.Color('#E1754B');
  island.materials.magicPortal.emissiveIntensity = 0;

  // island.materials.portalPlate.emissiveIntensity = portalPlate.emissiveIntensity;
  island.materials.portalPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.halloweenPlate.emissive = new THREE.Color('#68CFF2');
  island.materials.halloweenPlate.emissiveIntensity = 0;

  if (IS_MOBILE_DEVICE) island.materials.controls.opacity = 0;

  /**
   * Island Animations Activation
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
        pressurePlatesSoundEffect.seek(0);
        pressurePlatesSoundEffect.play();
      }
    );

    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      magicGlyphActivation => {
        // Magic Glyphs Rotation
        magicGlyphActivationRef.current = true;

        // Sound Effect
        magicGlyphSoundEffect.play();
        magicGlyphSoundEffect.fade(0, MAGIC_GLYPH_SOUND_VOLUME, 500);

        // Magic Glyphs Animation
        gsap.fromTo(
          island.materials.magicPortal,
          { emissiveIntensity: 0 },
          { duration: 1, emissiveIntensity: 4.7 }
        );
      }
    );

    // Clear animations, interval and subscriptions on unmount
    return () => {
      unsubActivePlate();
      unsubMagicGlyphActivation();
    };
  }, []);

  return (
    <>
      <primitive
        object={island.scene}
        scale={0.45}
        position={ISLAND_POSITION}
      />
      {/* <LiquidsShaders
        well={island.scene.children[0].children[0].children[6]}
        cauldron={island.scene.children[0].children[0].children[7]}
      /> */}
      <Well island={island} />
      <MagicBooks
        magicBooks={island.scene.children[0].children[0].children[9]}
      />
      <MagicLetters
        magicLetters={island.scene.children[0].children[0].children[10]}
        island={island.scene.children[0].children[0].children[0]}
      />
      <CountriesFlags island={island} />
      <SleepText />
      <LanternsAndHome island={island} />
      <Forge islandAnimations={islandAnimations} />
    </>
  );
};

useGLTF.preload(islandModel);

export default Island;
