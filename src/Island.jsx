import { useGLTF, useAnimations } from "@react-three/drei";
import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva"; "use strict";
import LiquidsShaders from "./LiquidsShaders";
import MagicBooksShader from "./MagicBooksShader";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import MagicLetters from "./MagicLetters"
import SleepText from "./SleepText";
import AnimatedFlag from "./AnimatedFlag";
import { useFrame } from "@react-three/fiber";

const ISLAND_POSITION = [-1.35, 2.25, -15]
const ANVIL_POSITION = new THREE.Vector3(-5.8, 1.8, -10.8)


const Island = () => {

  const magicGlyphActivationRef = useRef(false);

  const isMobile = useStore(state => state.isMobile);
  const disableSounds = useStore(state => state.disableSounds);

  const shadowsIntensity = useControls("shadowsIntensity", {
    shadowsIntensity: { value: 2.73, min: 0, max: 20, step: 0.001 }
  })

  const envMap = useControls("envMap", {
    intensity: { value: 0.5, min: 0, max: 1, step: 0.001 },
  });

  const portalPlate = useControls("portalPlate", {
    emissiveIntensity: { value: 0.5, min: 0, max: 100, step: 0.01 },
  });


  //   /**
  //    * Island initialization
  //    */
  const island = useMemo(() => {
    const island = useGLTF("/models/island/islandCopy42.glb")
    island.scene.traverse((child) => {
      if (child.isMesh && child.material.isMeshStandardMaterial) {
        child.material.name === "islandTexture" && !isMobile ?
          child.receiveShadow = true :
          child.material.toneMapped = false;

        child.material.envMapIntensity = envMap.intensity;
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
  })

  const islandAnimations = useAnimations(island.animations, island.scene)

  // useLayoutEffect(() => {
  island.materials.islandTexture.aoMapIntensity = shadowsIntensity.shadowsIntensity;
  island.materials.magicPortal.emissive = new THREE.Color("#E1754B");
  island.materials.magicPortal.emissiveIntensity = 0;

  // island.materials.portalPlate.emissiveIntensity = portalPlate.emissiveIntensity;
  island.materials.portalPlate.emissive = new THREE.Color("#68CFF2");
  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color("#68CFF2");
  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.halloweenPlate.emissive = new THREE.Color("#68CFF2");
  island.materials.halloweenPlate.emissiveIntensity = 0;

  // console.log(island.materials.portalPlate.emissive, island.materials.seaPlate.emissive)
  // }, []);



  /**
   * Island Animations Activation
   */
  useLayoutEffect(() => {
    // Configure and play islands animations
    islandAnimations.actions["anvilAnimation"].loop = THREE.LoopOnce
    islandAnimations.actions["anvilAnimation"].clampWhenFinished = true
    islandAnimations.actions["details"].play();


    // Configure audio sound effects
    const pressurePlatesSoundEffect = (() => {
      if (disableSounds !== false) return undefined;
      const pressurePlatesSoundEffect = new Audio("/sounds/pressurePlatesSoundEffect.mp3")
      pressurePlatesSoundEffect.volume = 0.1;
      return pressurePlatesSoundEffect;
      
    })()

    const magicGlyphSoundEffect =
      disableSounds !== false ?
        undefined :
        new Audio("/sounds/magicGlyphSoundEffect.mp3")

    const hammerSoundEffect = (() => {
      if (disableSounds !== false) return undefined;
      const hammerSoundEffect = new Audio("/sounds/hammerSoundEffect.mp3")
      hammerSoundEffect.volume = 0;
      return hammerSoundEffect  
    })()

    // Play forge hammer sound and anvil animation each 2s
    const forgeHammerInterval = setInterval(() => {
      disableSounds !== false ? undefined : hammerSoundEffect.play();
      islandAnimations.actions["anvilAnimation"].reset().play()
    }, 2000)

    // Subscribe to activePlate zustand store state
    const unSubActivePlate = useStore.subscribe((state) => state.activePlate,
      (activePlate, prevPlate) => {
        gsap.to(island.materials[activePlate], { duration: 0.2, emissiveIntensity: 3 })
        if (prevPlate)
          gsap.to(island.materials[prevPlate], { duration: 0, emissiveIntensity: 0 })
        if (disableSounds === false) {
          pressurePlatesSoundEffect.currentTime = 0;
          pressurePlatesSoundEffect.play();
        }
      }
    )

    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      (state) => state.magicGlyphActivation,
      (magicGlyphActivation) => {
        // Activate Magic Glyphs Animations
        magicGlyphActivationRef.current = true;

        // Play Magic Glyphs Sound Effect
        if (disableSounds === false) {
          magicGlyphSoundEffect.play()
          gsap.fromTo(magicGlyphSoundEffect, { volume: 0 }, { delay: 0.1, duration: 0.5, volume: 0.2 });
        }

        // Activate Magic Glyphs Emissive Intensity Animation
        gsap.fromTo(island.materials.magicPortal,
          { emissiveIntensity: 0 },
          { duration: 1, emissiveIntensity: 4.7 }
        )
      }
    )


    const unsubCharacterPosition = disableSounds !== false ? undefined : useStore.subscribe(
      state => state.characterPosition,
      (characterPosition) => {
        if (characterPosition) {
          hammerSoundEffect.volume = ANVIL_POSITION.distanceTo(characterPosition) < 17 ?
            Math.min(((1 / ANVIL_POSITION.distanceTo(characterPosition))), 0.2)
            : 0;
        }
      }
    )

    // Clear animations, interval and subscriptions on unmount
    return () => {
      islandAnimations.actions["anvilAnimation"].stop();
      // islandAnimations.actions["magicPotAnimation"].getMixer().uncacheAction(islandAnimations.actions["magicPotAnimation"]);

      unSubActivePlate();
      unsubMagicGlyphActivation();

      clearInterval(forgeHammerInterval);
      if (disableSounds === false) {
        unsubCharacterPosition();
      }
    }
  }, [disableSounds]);

  return (
    <>
      <primitive object={island.scene} scale={0.45} position={ISLAND_POSITION} />
      <LiquidsShaders
        well={island.scene.children[0].children[0].children[6]}
        cauldron={island.scene.children[0].children[0].children[7]}
      />
      <MagicBooksShader magicBooks={island.scene.children[0].children[0].children[9]} />
      <MagicLetters
        magicLetters={island.scene.children[0].children[0].children[10]}
        island={island.scene.children[0].children[0].children[0]}
      />
      <AnimatedFlag flag={island.scene.children[0].children[0].children[16]} offset={0.345} />
      <AnimatedFlag flag={island.scene.children[0].children[0].children[17]} offset={0.265} />
      <AnimatedFlag flag={island.scene.children[0].children[0].children[18]} offset={0.26} />
      {/* br 16 fr 17 and sp 18 => flags */}
      <SleepText />
    </>
  );
};

// useGLTF.preload("/models/island.glb");

export default Island;
