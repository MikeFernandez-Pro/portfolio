import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import MagicLetters from "./MagicLetters"
import SleepText from "./SleepText";

const ANVIL_POSITION = new THREE.Vector3(-5.8, 1.8, -10.8)

const Island = () => {

  const forgeHammer = useMemo(() => new Audio("/sounds/forgeHammer.mp3"), [])

  const shadowsIntensity = useControls("shadowsIntensity", {
    shadowsIntensity: { value: 2.73, min: 0, max: 5, step: 0.001 }
  })

  const controls = useControls("controls", {
    intensity: { value: 169.30, min: 0, max: 200, step: 0.001 },
    color: "#ffbf97",
  });

  const signs = useControls("signs", {
    intensity: { value: 130.84, min: 0, max: 200, step: 0.001 },
    color: "#ffbf97",
  });

  const candles = useControls("candles", {
    intensity: { value: 13.51, min: 0, max: 50, step: 0.001 },
    color: "#ffaf67",
  });
  const forgeSword = useControls("forgeSword", {
    intensity: { value: 6.35, min: 0, max: 50, step: 0.001 },
    color: "#ff7e66",
  });
  const lanternsAndHomes = useControls("lanternsAndHomes", {
    intensity: { value: 7.07, min: 0, max: 50, step: 0.001 },
    color: "#b77c6a",
  });

  const magicPortal = useControls("magicPortal", {
    intensity: { value: 0, min: 0, max: 5, step: 0.001 },
    color: "#61acd4",
  });

  const pressurePlates = useControls("pressurePlates", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#68cff2",
  });

  const torchesAndFire = useControls("torchesAndFire", {
    intensity: { value: 4.87, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });

  //   /**
  //    * Island initialization
  //    */
  const island = useGLTF("/models/island/islandCompiled.glb");

  island.scene.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.name === "islandTexture" ?
        child.receiveShadow = true :
        child.material.toneMapped = false;
    }
  });

  const islandAnimations = useAnimations(island.animations, island.scene)

  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  island.materials.islandTexture.aoMapIntensity = shadowsIntensity.shadowsIntensity;

  island.materials.candles.emissiveIntensity = candles.intensity;
  island.materials.candles.emissive = new THREE.Color(candles.color);


  island.materials.signs.emissiveIntensity = signs.intensity;
  island.materials.signs.emissive = new THREE.Color(signs.color);


  island.materials.forgeSword.emissiveIntensity = forgeSword.intensity;
  island.materials.forgeSword.emissive = new THREE.Color(forgeSword.color);

  island.materials.lava.emissiveIntensity = 3;
  island.materials.lava.emissive = new THREE.Color("#ffa05e");

  island.materials.lanternsAndHomes.emissiveIntensity = lanternsAndHomes.intensity;
  island.materials.lanternsAndHomes.emissive = new THREE.Color(lanternsAndHomes.color);

  island.materials.magicPortal.emissiveIntensity = magicPortal.intensity;
  island.materials.magicPortal.emissive = new THREE.Color(magicPortal.color);

  island.materials.torchesAndFire.emissiveIntensity = torchesAndFire.intensity;
  island.materials.torchesAndFire.emissive = new THREE.Color(torchesAndFire.color);


  island.materials.galaxyPlate.emissiveIntensity = 0;
  island.materials.galaxyPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);

  island.materials.controls.emissiveIntensity = controls.intensity;
  island.materials.controls.emissive = new THREE.Color(controls.color);


  const subCharacterPosition= useStore.subscribe(
    state => state.characterPosition,
    characterPosition => forgeHammer.volume = Math.min(1 / ANVIL_POSITION.distanceTo(characterPosition), 1) * 0.5
  )

  /**
   * Island Animations Activation
   */
  useEffect(() => {
    islandAnimations.actions["magicPotAnimation"].play();
    islandAnimations.actions["details"].play();
    islandAnimations.actions["anvilAnimation"].loop = THREE.LoopOnce;
    islandAnimations.actions["anvilAnimation"].clampWhenFinished = true;

    setInterval(() => {
      forgeHammer.play();
      islandAnimations.actions["anvilAnimation"].reset().play()
    }, 2000)
  }, []);

  /**
   * Projects Activation Plates
   */

  // Subscribe to activePlate and prevPlate zustand store states
  const subPlates = useStore.subscribe((state) => state.activePlate,
    (activePlate, prevPlate) => {
      gsap.to(island.materials[activePlate], { duration: 0.2, emissiveIntensity: 3 })
      gsap.to(island.materials[prevPlate], { duration: 0, emissiveIntensity: 0 })
    }
  )
  

  // Retrieve magicCircleActivation zustand state
  const magicCircleActivation = useStore(state => state.magicCircleActivation)

  if (magicCircleActivation) {
    gsap.to(island.materials.magicPortal, { duration: 1, emissiveIntensity: 3.95 })
  }

  return (
    <>
      <primitive object={island.scene} scale={0.45} position={islandPosition} />
      <LiquidMeshes
        well={island.scene.children[0].children[0].children[6]}
        cauldron={island.scene.children[0].children[0].children[7]}
      />
      <MagicBooks magicBooks={island.scene.children[0].children[0].children[9]} />
      <MagicLetters
        magicLetters={island.scene.children[0].children[0].children[10]}
        island={island.scene.children[0].children[0].children[0]}
      />
      <SleepText />
    </>
  );
};

// useGLTF.preload("/models/island.glb");

export default Island;
