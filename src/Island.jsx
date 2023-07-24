import { useGLTF, useAnimations, SoftShadows, shaderMaterial} from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import {
    RigidBody
} from "@react-three/rapier";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { useControls } from "leva";
import LavaMesh from "./LavaMesh";
import LiquidMeshes from "./LiquidMeshes";
import DissolveEffectShaderMaterial from "./DissolveMaterial";
import MagicBooks from "./MagicBooks";

const Island = ({setIslandComponentMounted}) => {

    const lamps = useControls("lamps", {
        intensity: {value: 3, min:0, max: 50, step: 0.01},
        color: "#ffaf67"
    })
    
    const torches = useControls("torches", {
        intensity: {value: 3, min:0, max: 50, step: 0.01},
        color: "#ef9f65"
    })

    const window = useControls("window", {
        intensity: {value: 3.47, min:0, max: 50, step: 0.01},
        color: "#ffaf67"
    })

    const portal = useControls("portal", {
        intensity: {value: 3, min:0, max: 50, step: 0.01},
        color: "#ffaf67"
    })

    const pressurePlates = useControls("pressurePlates", {
        intensity: {value: 3, min:0, max: 50, step: 0.01},
        color: "#ffaf67"
    })
    const sword = useControls("sword", {
        intensity: {value: 3.94, min:0, max: 50, step: 0.01},
        color: "#f85f3d"
    })

    const island = useGLTF("/models/island.glb");
    const { nodes, materials } = useGLTF("/models/IslandCollider.glb");
    const shaderedMeshes = useGLTF("/models/shaderedMeshes.glb");
    
    const islandAnimations = useAnimations(island.animations, island.scene)
  
    // console.log(island)
    island.scene.traverse((child) => {
        // Check if the child object is a Mesh
        if (child.isMesh && child.material.isMeshStandardMaterial) {
          // Set the shadowSide property to THREE.DoubleSide
          child.castShadow = true;
          child.receiveShadow = true;
          child.material.roughness = 1;

          if (child.material.name === "lamps") {
            child.material.emissiveIntensity = lamps.intensity;
            child.material.emissive = new THREE.Color( lamps.color )
            child.material.toneMapped = false;
          } 
          if (child.material.name === "torches") {
            child.material.emissiveIntensity = torches.intensity;
            child.material.emissive = new THREE.Color( torches.color )
            child.material.toneMapped = false;
          } if(child.material.name === "window") {
            child.material.emissiveIntensity = window.intensity;
            child.material.emissive = new THREE.Color( window.color )
            child.material.toneMapped = false;
          } if (child.material.name === "magicPortal") {
            child.material.emissiveIntensity = portal.intensity;
            child.material.emissive = new THREE.Color( portal.color )
            child.material.toneMapped = false;
          } 
          if (child.material.name === "sword") {
            child.material.emissiveIntensity = sword.intensity;
            child.material.emissive = new THREE.Color( sword.color )
            child.material.toneMapped = false;
          } if (child.material.name === "pressurePlates") {
            child.material.emissiveIntensity = pressurePlates.intensity;
            child.material.emissive = new THREE.Color( pressurePlates.color )
            child.material.toneMapped = false;
          } 
        }
      });
    
    //   console.log(islandAnimations)
    useEffect(() => {
        setIslandComponentMounted(true)
        islandAnimations.actions["anvilAnimation"].play()
        islandAnimations.actions["magicPotAnimation"].play()
        islandAnimations.actions["grinderSwordAnimation"].play()
        islandAnimations.actions["Key.020Action.198"].play() 
    }, []);

  

    const collidersMaterial = new THREE.MeshBasicMaterial({visible: false})
    const [ magicCircleActivated, setMagicCircleActivated ] = useState(false)

    const islandPosition = [-1.35, 2.3, -15]

    return (
        <>
            <primitive object={island.scene} scale={0.45} position={islandPosition} />
            <LiquidMeshes
              well={island.scene.children[0].children[0].children[8]}
              cauldron={island.scene.children[0].children[0].children[10]}
              />
            <LavaMesh lavaMesh={island.scene.children[0].children[0].children[9]}/>
            <MagicBooks islandPosition={islandPosition} activation={magicCircleActivated}/>   
            <RigidBody type={"fixed"} colliders={"trimesh"} >
            <mesh scale={0.45} position={islandPosition} geometry={nodes.Collider.geometry} material={collidersMaterial}/>
            </RigidBody>
            <RigidBody type={"fixed"} colliders={"trimesh"} onCollisionEnter={() => setMagicCircleActivated(true)}>
            <mesh scale={0.45} position={islandPosition} geometry={nodes.magicCircle.geometry} material={collidersMaterial}/>
            </RigidBody>
        </> 
    );
};
useGLTF.preload("/models/island.glb");
useGLTF.preload("/models/IslandCollider.glb");

export default Island;
