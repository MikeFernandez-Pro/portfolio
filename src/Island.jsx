import { useGLTF, useAnimations, SoftShadows, shaderMaterial } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LavaMesh from "./LavaMesh";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";

const Island = ({ setIslandComponentMounted }) => {
  const lamps = useControls("lamps", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#ffaf67",
  });

  const torches = useControls("torches", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#ef9f65",
  });

  const window = useControls("window", {
    intensity: { value: 3.47, min: 0, max: 50, step: 0.01 },
    color: "#ffaf67",
  });

  const magicCircle = useControls("magicCircle", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#ffaf67",
  });

  const pressurePlates = useControls("pressurePlates", {
    intensity: { value: 3, min: 0, max: 50, step: 0.01 },
    color: "#68cff2",
  });
  const sword = useControls("sword", {
    intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });
  const magicLetters = useControls("magicLetters", {
    intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
    color: "#f85f3d",
  });

  /**
   * Island initialization
   */
  const island = useGLTF("/models/island.glb");
  const islandAnimations = useAnimations(island.animations, island.scene)
  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  island.scene.traverse((child) => {
    // Check if the child object is a Mesh
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      // Set the shadowSide property to THREE.DoubleSide
      child.castShadow = true;
      child.receiveShadow = true;
      child.material.roughness = 1;
    }
  });

  island.materials.lamps.emissiveIntensity = lamps.intensity;
  island.materials.lamps.emissive = new THREE.Color(lamps.color);
  island.materials.lamps.toneMapped = false;

  island.materials.torches.emissiveIntensity = torches.intensity;
  island.materials.torches.emissive = new THREE.Color(torches.color);
  island.materials.torches.toneMapped = false;

  island.materials.window.emissiveIntensity = window.intensity;
  island.materials.window.emissive = new THREE.Color(window.color);
  island.materials.window.toneMapped = false;

  island.materials.magicPortal.color = new THREE.Color(magicCircle.color)
  island.materials.magicPortal.emissiveIntensity = 0;
  island.materials.magicPortal.emissive = new THREE.Color(magicCircle.color);
  island.materials.magicPortal.toneMapped = false;

  island.materials.sword.emissiveIntensity = sword.intensity;
  island.materials.sword.emissive = new THREE.Color(sword.color);
  island.materials.sword.toneMapped = false;

  island.materials.galaxyPlate.emissiveIntensity = 0;
  island.materials.galaxyPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.galaxyPlate.toneMapped = false;

  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.portalPlate.toneMapped = false;

  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.seaPlate.toneMapped = false;

  island.materials.magicLetters.emissiveIntensity = magicLetters.intensity;
  island.materials.magicLetters.emissive = new THREE.Color(magicLetters.color);
  island.materials.magicLetters.toneMapped = false;
  island.materials.magicLetters.opacity = 0;
  island.materials.magicLetters.transparent = true;

  /**
   * Island Animations Activation
   */
  const setIslandMounted = useStore(state => state.setIslandMounted)
  useEffect(() => {
    islandAnimations.actions["anvilAnimation"].play();
    islandAnimations.actions["magicPotAnimation"].play();
    islandAnimations.actions["grinderSwordAnimation"].play()
    islandAnimations.actions["Key.020Action.198"].play();
    setIslandComponentMounted(true);
    setIslandMounted();
  }, []);

  /**
   * Magic Circle 
   */

  const magicCircleActivation = useStore(state => state.magicCircleActivation)

  if (magicCircleActivation) {
    gsap.to(island.materials.magicPortal, { duration: 1, emissiveIntensity: 3 })
    gsap.to(island.materials.magicLetters, { duration: 2, delay: 2, opacity: 1 })
  }

  /**
   * Projects Activation Plates
   */
  
  const activePlate = useStore(state => state.activePlate)
  const prevPlate = useStore(state => state.prevPlate)

  useEffect(() => {
    if (prevPlate)
      gsap.to(island.materials[prevPlate], { duration: 1, emissiveIntensity: 0 });
    gsap.to(island.materials[activePlate], { duration: 0.2, emissiveIntensity: 3 });
  }, [activePlate, prevPlate]);

  return (
    <>  
      <primitive object={island.scene} scale={0.45} position={islandPosition} />
      <LiquidMeshes 
        well={island.scene.children[0].children[0].children[7]}
        cauldron={island.scene.children[0].children[0].children[9]}
      />
      <LavaMesh lavaMesh={island.scene.children[0].children[0].children[8]} />
      <MagicBooks islandPosition={islandPosition} />
    </>
  );
};

useGLTF.preload("/models/island.glb");

export default Island;
