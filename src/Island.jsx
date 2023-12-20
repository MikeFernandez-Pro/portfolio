import { useGLTF, useAnimations } from "@react-three/drei";
import React, { useEffect, useLayoutEffect, useMemo } from "react";
import * as THREE from "three";
import { useControls } from "leva";"use strict";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import MagicLetters from "./MagicLetters"
import SleepText from "./SleepText";
import { act, useFrame, useLoader, useThree } from "@react-three/fiber";
import AnimatedFlag from "./AnimatedFlag";

const ANVIL_POSITION = new THREE.Vector3(-5.8, 1.8, -10.8)

const Island = () => {

  const forgeHammerSound = useMemo(() => new Audio("/sounds/forgeHammer.mp3"), [])
  forgeHammerSound.volume = 0;

  const shadowsIntensity = useControls("shadowsIntensity", {
    shadowsIntensity: { value: 2.73, min: 0, max: 20, step: 0.001 }
  })

  const controls = useControls("controls", {
    intensity: { value: 200.00, min: 0, max: 200, step: 0.001 },
    color: "#ffa167",
  });

  const signs = useControls("signs", {
    intensity: { value: 183.01, min: 0, max: 500, step: 0.001 },
    color: "#ffa167",
  });

  const candles = useControls("candles", {
    intensity: { value: 13.51, min: 0, max: 200, step: 0.001 },
    color: "#ffaf67",
  });
  const forgeSword = useControls("forgeSword", {
    intensity: { value: 6.35, min: 0, max: 50, step: 0.001 },
    color: "#ff6347",
  });
  const lanternsAndHomes = useControls("lanternsAndHomes", {
    intensity: { value: 3.95, min: 0, max: 50, step: 0.001 },
    color: "#ff7e7e",
  });

  const magicPortal = useControls("magicPortal", {
    intensity: { value: 0, min: 0, max: 10, step: 0.001 },
    color: "#e1754b",
  });

  const pressurePlates = useControls("pressurePlates", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#68cff2",
  });

  const torchesAndFire = useControls("torchesAndFire", {
    intensity: { value: 4.87, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });

  const lava = useControls("lava", {
    intensity: { value: 4.42, min: 0, max: 10, step: 0.001 },
    color: "#ff876b",
  });


  //   /**
  //    * Island initialization
  //    */
  const island = useMemo(() => useGLTF("/models/finalIsland/island.glb"), []);

  island.scene.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.name === "islandTexture" ?
        child.receiveShadow = true :
        child.material.toneMapped = false;
    }
  });

 

  const islandAnimations = useAnimations(island.animations, island.scene)

  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  // useLayoutEffect(() => {
  island.materials.islandTexture.aoMapIntensity = shadowsIntensity.shadowsIntensity;

  island.materials.candles.emissiveIntensity = candles.intensity;
  island.materials.candles.emissive = new THREE.Color(candles.color);


  island.materials.signs.emissiveIntensity = signs.intensity;
  island.materials.signs.emissive = new THREE.Color(signs.color);


  island.materials.forgeSword.emissiveIntensity = forgeSword.intensity;
  island.materials.forgeSword.emissive = new THREE.Color(forgeSword.color);

  island.materials.lava.emissiveIntensity = lava.intensity;
  island.materials.lava.emissive = new THREE.Color(lava.color);

  island.materials.lanternsAndHomes.emissiveIntensity = lanternsAndHomes.intensity;
  island.materials.lanternsAndHomes.emissive = new THREE.Color(lanternsAndHomes.color);

  island.materials.magicPortal.emissiveIntensity = magicPortal.intensity;
  island.materials.magicPortal.emissive = new THREE.Color(magicPortal.color);

  island.materials.torchesAndFire.emissiveIntensity = torchesAndFire.intensity;
  island.materials.torchesAndFire.emissive = new THREE.Color(torchesAndFire.color);


  island.materials.halloweenPlate.emissiveIntensity = 0;
  island.materials.halloweenPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.controls.emissiveIntensity = controls.intensity;
  island.materials.controls.emissive = new THREE.Color(controls.color);
  // }, []);




  /**
   * Island Animations Activation
   */
  useLayoutEffect(() => {
    // Configure and play islands animations
    islandAnimations.actions["anvilAnimation"].loop = THREE.LoopOnce;
    islandAnimations.actions["anvilAnimation"].clampWhenFinished = true;
    islandAnimations.actions["magicPotAnimation"].play();
    islandAnimations.actions["details"].play();

    // Play forge hammer sound and anvil animation each 2s
    const forgeHammerInterval = setInterval(() => {
      forgeHammerSound.play();
      islandAnimations.actions["anvilAnimation"].reset().play()
    }, 2000)

    // Subscribe to activePlate zustand store state
    const unSubActivePlate = useStore.subscribe((state) => state.activePlate,
      (activePlate, prevPlate) => {
        gsap.to(island.materials[activePlate], { duration: 0.2, emissiveIntensity: 3 })
        gsap.to(island.materials[prevPlate], { duration: 0, emissiveIntensity: 0 })
      }
    )

    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      (state) => state.magicGlyphActivation,
      (magicGlyphActivation) => {
        gsap.fromTo(island.materials.magicPortal,
          { emissiveIntensity: 0 },
          { duration: 1.5, emissiveIntensity: 4.7, ease: "power4.out" }
        )
      }
    )

    const unsubCharacterPosition = useStore.subscribe(
      state => state.characterPosition,
      (characterPosition) => {
        if (characterPosition) {
          forgeHammerSound.volume = ANVIL_POSITION.distanceTo(characterPosition) < 17 ?
            Math.min(((1 / ANVIL_POSITION.distanceTo(characterPosition))), 0.2)
            : 0;
        }
      }
    )

    // Clear animations, interval and subscriptions on unmount
    return () => {
      islandAnimations.actions["anvilAnimation"].stop();
      islandAnimations.actions["magicPotAnimation"].stop();
      // islandAnimations.actions["details"].stop();

      clearInterval(forgeHammerInterval);

      unSubActivePlate();
      unsubMagicGlyphActivation();
      unsubCharacterPosition();
    }
  }, []);

  return (
    <>
      <primitive object={island.scene} scale={0.45} position={islandPosition} />
      <LiquidMeshes
        well={island.scene.children[0].children[0].children[1]}
        cauldron={island.scene.children[0].children[0].children[2]}
      />
      <MagicBooks magicBooks={island.scene.children[0].children[0].children[9]} />
      <MagicLetters
        magicLetters={island.scene.children[0].children[0].children[10]}
        island={island.scene.children[0].children[0].children[0]}
      />
      <AnimatedFlag flag={island.scene.children[0].children[0].children[16]} offset={0.345}/>
      <AnimatedFlag flag={island.scene.children[0].children[0].children[17]} offset={0.265}/>
      <AnimatedFlag flag={island.scene.children[0].children[0].children[18]} offset={0.26}/>
      {/* br 16 fr 17 and sp 18 => flags */}
      <SleepText />
    </>
  );
};

// useGLTF.preload("/models/island.glb");

export default Island;
