import { useGLTF, useAnimations, SoftShadows, shaderMaterial, Svg, Image, Text, Instance, Instances, Html, Plane } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LavaMesh from "./LavaMesh";
import LiquidMeshes from "./LiquidMeshes";
import MagicBooks from "./MagicBooks";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";
import { act, extend, useFrame, useLoader } from "@react-three/fiber";
import MagicLetters from "./MagicLetters";
import { DoubleSide } from "three";
import { MeshStandardMaterial } from "three";
import SleepText from "./SleepText";

const Island = () => {
  //   const staticLights = useControls("staticLights", {
  //     // intensity: { value: 17.21, min: 2, max: 50, step: 0.001 },
  //     intensity: { value: 0, min: 2, max: 50, step: 0.001 },
  //     color: "#ffaf67",
  //     aoMapIntensity: { value: 1, min: 0, max: 5, step: 0.001 },
  //   });
  //   const magicCircle = useControls("magicCircle", {
  //     intensity: { value: 3, min: 0, max: 50, step: 0.01 },
  //     color: "#ffaf67",
  //   });

  //   const pressurePlates = useControls("pressurePlates", {
  //     intensity: { value: 3, min: 0, max: 50, step: 0.01 },
  //     color: "#68cff2",
  //   });
  //   const sword = useControls("sword", {
  //     intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
  //     color: "#f85f3d",
  //   });
  //   const magicLetters = useControls("magicLetters", {
  //     intensity: { value: 3.94, min: 0, max: 50, step: 0.01 },
  //     color: "#f85f3d",
  //   });

  //   /**
  //    * Island initialization
  //    */
  //   const island = useGLTF("/models/island.glb");
  //   const islandAnimations = useAnimations(island.animations, island.scene)
  const islandPosition = useMemo(() => [-1.35, 2.3, -15], []);

  const islandTexture = useLoader(THREE.TextureLoader, "textures/islandTexture.png")
  //   const islandShadowMap = useLoader(THREE.TextureLoader, "textures/shadowsBakedBlurred.png")

  islandTexture.flipY = false;
  islandTexture.colorSpace = THREE.SRGBColorSpace

  //   islandShadowMap.flipY = false;
  //   islandShadowMap.colorSpace = THREE.SRGBColorSpace
  //   islandShadowMap.channel = 1

  //   island.materials.islandTexture.map = islandTexture;
  //   island.materials.islandTexture.aoMap = islandShadowMap;
  //   island.materials.islandTexture.aoMapIntensity = staticLights.aoMapIntensity;
  //   island.materials.islandTexture.color = new THREE.Color(1, 1, 1);

  //   const { envMapIntensity } = useControls('environment map', {
  //     envMapIntensity: { value: 1, min: 0, max: 12 }
  //   })

  //   island.scene.traverse((child) => {
  //     if (child.isMesh && child.material.isMeshStandardMaterial) {
  //       child.material.roughness = 1;
  //       child.material.envMapIntensity = envMapIntensity
  //     }
  //   });

  //   island.materials.hammer.map = islandTexture;
  //   island.materials.hammer.color = new THREE.Color(1, 1, 1);


  //   island.materials.staticLights.map = islandTexture;
  //   island.materials.staticLights.color = new THREE.Color(1, 1, 1);
  //   island.materials.staticLights.emissiveIntensity = 5;



  //   island.materials.magicPortal.color = new THREE.Color(magicCircle.color)
  //   island.materials.magicPortal.emissiveIntensity = 0;
  //   island.materials.magicPortal.emissive = new THREE.Color(magicCircle.color);
  //   island.materials.magicPortal.toneMapped = false;

  //   island.materials.magicLetters.emissiveIntensity = 4;
  //   island.materials.magicLetters.toneMapped = false;
  //   island.materials.magicLetters.map = islandTexture;

  //   island.materials.galaxyPlate.emissiveIntensity = 0;
  //   island.materials.galaxyPlate.emissive = new THREE.Color(pressurePlates.color);
  //   island.materials.galaxyPlate.toneMapped = false;
  //   island.materials.galaxyPlate.map = islandTexture;

  //   island.materials.portalPlate.emissiveIntensity = 0;
  //   island.materials.portalPlate.emissive = new THREE.Color(pressurePlates.color);
  //   island.materials.portalPlate.toneMapped = false;
  //   island.materials.portalPlate.map = islandTexture;

  //   island.materials.seaPlate.emissiveIntensity = 0;
  //   island.materials.seaPlate.emissive = new THREE.Color(pressurePlates.color);
  //   island.materials.seaPlate.toneMapped = false;
  //   island.materials.seaPlate.map = islandTexture;

  //   // console.log(island.scene.children[0].children[0])
  //   /**
  //    * Island Animations Activation
  //    */
  //   useEffect(() => {
  //     islandAnimations.actions["anvilAnimation"].play();
  //     islandAnimations.actions["magicPotAnimation"].play();
  //     islandAnimations.actions["Key.020Action.001"].play();
  //   }, []);

  //   /**
  //    * Magic Circle 
  //    */

  //   const magicCircleActivationRef = useRef(useStore.getState().magicCircleActivation)

  //   /**
  //    * Projects Activation Plates
  //    */

  //   // Subscribe to activePlate and prevPlate zustand store states
  //   const subPrevPlate = useStore.subscribe((state) => state.prevPlate, (state) => gsap.to(island.materials[state], { duration: 0, emissiveIntensity: 0 }))
  //   const subActivePlate = useStore.subscribe((state) => state.activePlate, (state) => gsap.to(island.materials[state], { duration: 0.2, emissiveIntensity: 3 }))

  //   // Retrieve magicCircleActivation zustand state
  //   const magicCircleActivation = useStore(state => state.magicCircleActivation)

  //   if (magicCircleActivation) {
  //     gsap.to(island.materials.magicPortal, { duration: 1, emissiveIntensity: 2.3 })
  //   }

  //   return (
  //     <>
  //       <primitive object={island.scene} scale={0.45} position={islandPosition} />
  //       <LiquidMeshes
  //         well={island.scene.children[0].children[0].children[2]}
  //         cauldron={island.scene.children[0].children[0].children[5]}
  //       />
  //       <LavaMesh lavaMesh={island.scene.children[0].children[0].children[3]} />
  //       <MagicBooks magicBooks={island.scene.children[0].children[0].children[9]} texture={islandTexture} />
  //       <MagicLetters magicLetters={island.scene.children[0].children[0].children[11]} texture={islandTexture} />
  //       <SleepText />
  //     </>
  //   );
  // };

  const group = useRef();
  const { nodes, materials, animations, scene } = useGLTF("/models/mergedIsland.glb");
  const { actions } = useAnimations(animations, group);
  const shapeKeys = useAnimations(animations, scene)

  useEffect(() => {
    actions["anvilAnimation"].play();
    actions["magicPotAnimation"].play();
    shapeKeys.actions["details"].play();
  }, []);

  return (
    <>
    <group ref={group} dispose={null} scale={0.45} position={islandPosition} >
      <group name="Scene">
        <group name="Armature" position={[0.02, 0, -0.125]}>
          <group name="island">
                        { /* Magic books mesh */}
             <MagicBooks magicBooks={nodes.island_10} texture={islandTexture}/>
          { /* Magic words mesh */}
             <MagicLetters magicLetters={nodes.island_11} texture={islandTexture} />
            { /* Main island mesh */}
            <skinnedMesh
              geometry={nodes.island_1.geometry}
              material={new THREE.MeshStandardMaterial({ map: islandTexture, transparent: true })}
              skeleton={nodes.island_1.skeleton}
              morphTargetDictionary={nodes.island_1.morphTargetDictionary}
              morphTargetInfluences={nodes.island_1.morphTargetInfluences}
            />
            { /* Lanterns and windows mesh */}
            <skinnedMesh
              geometry={nodes.island_2.geometry}
              material={materials.lanternsAndHomes}
              skeleton={nodes.island_2.skeleton}
              morphTargetDictionary={nodes.island_2.morphTargetDictionary}
              morphTargetInfluences={nodes.island_2.morphTargetInfluences}
            />
            { /* Torches and fire mesh */}
            <skinnedMesh
              geometry={nodes.island_3.geometry}
              material={materials.torchesAndFire}
              skeleton={nodes.island_3.skeleton}
              morphTargetDictionary={nodes.island_3.morphTargetDictionary}
              morphTargetInfluences={nodes.island_3.morphTargetInfluences}
            />
            { /* Forged sword mesh */}
            <skinnedMesh
              geometry={nodes.island_4.geometry}
              material={materials.forgeSword}
              skeleton={nodes.island_4.skeleton}
              morphTargetDictionary={nodes.island_4.morphTargetDictionary}
              morphTargetInfluences={nodes.island_4.morphTargetInfluences}
            />
            { /* Candles mesh */}
            <skinnedMesh
              geometry={nodes.island_5.geometry}
              material={materials.candles}
              skeleton={nodes.island_5.skeleton}
              morphTargetDictionary={nodes.island_5.morphTargetDictionary}
              morphTargetInfluences={nodes.island_5.morphTargetInfluences}
            />
            { /* Furnace lava mesh */}
            <LavaMesh furnace={nodes.island_6} />
            { /* Well water and cauldron potion meshes */}
            <LiquidMeshes well={nodes.island_7} cauldron={nodes.island_8} />
            { /* Magic glyph mesh */}
            <skinnedMesh
              geometry={nodes.island_9.geometry}
              material={materials.magicPortal}
              skeleton={nodes.island_9.skeleton}
              morphTargetDictionary={nodes.island_9.morphTargetDictionary}
              morphTargetInfluences={nodes.island_9.morphTargetInfluences}
            />

         
            { /* Sea plate mesh */}
            <skinnedMesh
              geometry={nodes.island_12.geometry}
              material={materials.seaPlate}
              skeleton={nodes.island_12.skeleton}
              morphTargetDictionary={nodes.island_12.morphTargetDictionary}
              morphTargetInfluences={nodes.island_12.morphTargetInfluences}
            />
            { /* Galaxy plate mesh */}
            <skinnedMesh
              geometry={nodes.island_13.geometry}
              material={materials.galaxyPlate}
              skeleton={nodes.island_13.skeleton}
              morphTargetDictionary={nodes.island_13.morphTargetDictionary}
              morphTargetInfluences={nodes.island_13.morphTargetInfluences}
            />
            { /* Portal plate mesh */}
            <skinnedMesh
              geometry={nodes.island_14.geometry}
              material={materials.portalPlate}
              skeleton={nodes.island_14.skeleton}
              morphTargetDictionary={nodes.island_14.morphTargetDictionary}
              morphTargetInfluences={nodes.island_14.morphTargetInfluences}
            />
          </group>
          <primitive object={nodes.hammer} />
          <primitive object={nodes.anvilSword} />
          <primitive object={nodes.pot} />
          <primitive object={nodes.neutral_bone} />
        </group>
      </group>
    </group>
    <SleepText />
    </>
  );
}

useGLTF.preload("/models/island.glb");

export default Island;
