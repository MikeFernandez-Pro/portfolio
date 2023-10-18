import { useGLTF, useAnimations } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LavaMesh from "./LavaMesh";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import { useLoader, useThree } from "@react-three/fiber";
import MagicLetters from "./MagicLetters"
import SleepText from "./SleepText";
import { KTX2Loader } from "three/examples/jsm/loaders/KTX2Loader";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";

const Island = () => {
  const shadowsIntensity = useControls("shadowsIntensity", {
    shadowsIntensity: { value: 2.73, min: 0, max: 5, step: 0.001 }
  })
  
  const signs = useControls("signs", {
    intensity: { value: 1.6, min: 0, max: 50, step: 0.001 },
    color: "#01ffe8",
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
    intensity: { value: 5.67, min: 0, max: 50, step: 0.001 },
    color: "#b77c6a",
  });

  const magicPortal = useControls("magicPortal", {
    intensity: { value: 0, min: 0, max: 50, step: 0.01 },
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
  const island = useGLTF("/models/island/islandNewShadows.glb");
  // const {gl} = useThree()

  // const island = useLoader(GLTFLoader, "/models/island/islandNewShadows.glb", (loader) => {
  //   const dracoLoader = new DRACOLoader();
  //   dracoLoader.setDecoderPath( '/draco/' );
    
  //   const ktxLoader = new KTX2Loader()
  //   ktxLoader.setTranscoderPath('/basis/')
  //   ktxLoader.detectSupport( gl );
  //   loader.setKTX2Loader(ktxLoader)
  //   loader.setDRACOLoader(dracoLoader)
  // })  
  

  island.scene.traverse((child) => {
    // Check if the child object is a Mesh
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      // Set the shadowSide property to THREE.DoubleSideq
      child.receiveShadow = true;
      // child.castShadow = true;
      child.material.roughness = 1;
    }
  });


  // const test = [MagicLetters, LavaMesh, LiquidMeshes, MagicBooks]

  const islandAnimations = useAnimations(island.animations, island.scene)
  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  const islandTexture = useLoader(THREE.TextureLoader, "textures/islandTexture.webp")
  const islandShadowMap = useLoader(THREE.TextureLoader, "textures/shadowMap.webp")


  islandTexture.flipY = false;
  islandTexture.colorSpace = THREE.SRGBColorSpace

  islandShadowMap.flipY = false;
  islandShadowMap.colorSpace = THREE.SRGBColorSpace
  islandShadowMap.channel = 1

  // island.materials.islandTexture.map = islandTexture;
  // island.materials.islandTexture.map.channel = 0;
  // island.materials.islandTexture.aoMap = islandShadowMap;
  // island.materials.islandTexture.aoMap.channel = 1;
  island.materials.islandTexture.aoMapIntensity = shadowsIntensity.shadowsIntensity;
  
  // island.materials.islandTexture.color = new THREE.Color(1, 1, 1);

  // island.materials.signs.map = islandTexture;

  const { envMapIntensity } = useControls('environment map', {
    envMapIntensity: { value: 1, min: 0, max: 12 }
  })

  island.scene.traverse((child) => {
    if (child.isMesh && child.material.isMeshStandardMaterial) {
      child.material.roughness = 1;
      child.material.envMapIntensity = envMapIntensity
    }
  });


  island.materials.candles.emissiveIntensity = candles.intensity;
  island.materials.candles.emissive = new THREE.Color(candles.color);
  island.materials.candles.toneMapped = false;

  island.materials.signs.emissiveIntensity = signs.intensity;
  island.materials.signs.emissive = new THREE.Color(signs.color);
  island.materials.signs.toneMapped = false;


  island.materials.forgeSword.emissiveIntensity = forgeSword.intensity;
  island.materials.forgeSword.emissive = new THREE.Color(forgeSword.color);
  island.materials.forgeSword.toneMapped = false;

  island.materials.lanternsAndHomes.emissiveIntensity = lanternsAndHomes.intensity;
  island.materials.lanternsAndHomes.emissive = new THREE.Color(lanternsAndHomes.color);
  island.materials.lanternsAndHomes.toneMapped = false;

  island.materials.magicPortal.emissiveIntensity = magicPortal.intensity;
  island.materials.magicPortal.emissive = new THREE.Color(magicPortal.color);
  island.materials.magicPortal.toneMapped = false;

  island.materials.torchesAndFire.emissiveIntensity = torchesAndFire.intensity;
  island.materials.torchesAndFire.emissive = new THREE.Color(torchesAndFire.color);
  island.materials.torchesAndFire.toneMapped = false;


  island.materials.galaxyPlate.emissiveIntensity = 0;
  island.materials.galaxyPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.galaxyPlate.toneMapped = false;
  // island.materials.galaxyPlate.map = islandTexture;

  island.materials.portalPlate.emissiveIntensity = 0;
  island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.portalPlate.toneMapped = false;
  // island.materials.portalPlate.map = islandTexture;

  island.materials.seaPlate.emissiveIntensity = 0;
  island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);
  island.materials.seaPlate.toneMapped = false;
  // island.materials.seaPlate.map = islandTexture;

  console.log(island.scene.children[0].children[0])
  // console.log(islandAnimations)
  /**
   * Island Animations Activation
   */
  useEffect(() => {
    islandAnimations.actions["anvilAnimation"].play();
    islandAnimations.actions["magicPotAnimation"].play();
    islandAnimations.actions["details"].play();
  }, []);

  /**
   * Magic Circle 
   */

  const magicCircleActivationRef = useRef(useStore.getState().magicCircleActivation)

  /**
   * Projects Activation Plates
   */

  // Subscribe to activePlate and prevPlate zustand store states
  const subPrevPlate = useStore.subscribe((state) => state.prevPlate, (state) => gsap.to(island.materials[state], { duration: 0, emissiveIntensity: 0 }))
  const subActivePlate = useStore.subscribe((state) => state.activePlate, (state) => gsap.to(island.materials[state], { duration: 0.2, emissiveIntensity: 3 }))

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
      <LavaMesh lavaMesh={island.scene.children[0].children[0].children[5]} />
      <MagicBooks magicBooks={island.scene.children[0].children[0].children[9]} texture={islandTexture} />
      <MagicLetters magicLetters={island.scene.children[0].children[0].children[10]} texture={islandTexture} />
      <SleepText />
    </>
  );
};

// useGLTF.preload("/models/island.glb");

export default Island;
