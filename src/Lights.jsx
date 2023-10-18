import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useControls, button } from "leva";
import { useFrame, useThree } from "@react-three/fiber";
import { useHelper } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import { Vector3 } from "three";

export default function Lights() {
    const keyLightRef = useRef();
    const  fillLightRef = useRef();
    const backLightRef = useRef();
    const characterLightRef = useRef();
 
    const keyLightHelper = useHelper(keyLightRef, THREE.DirectionalLightHelper, 0)
    const fillLighHelper = useHelper(fillLightRef, THREE.DirectionalLightHelper, 0)
    const backLightHelper = useHelper(backLightRef, THREE.DirectionalLightHelper, 0)
    // const characterLightHelper = useHelper(characterLightRef, THREE.DirectionalLightHelper, 0)

    const cameraOffset = () => new THREE.Vector3(0, 4, 0.5);
    
    if (keyLightHelper.current) {
        keyLightHelper.current.targetLine.geometry.setDrawRange(0, 0);
        fillLighHelper.current.targetLine.geometry.setDrawRange(0, 0);
        backLightHelper.current.targetLine.geometry.setDrawRange(0, 0);

    }


    const {scene } = useThree();
    const targetObject = new THREE.Object3D();
    scene.add(targetObject)

    // if (characterLightRef.current) {
    //     const test =  new THREE.CameraHelper(characterLightRef.current.shadow.camera)
    //     scene.add(test)
    //     scene.add( characterLightRef.current.target );
    // }

    let characterPosition = null;

        useFrame((state) => {
            if (characterLightRef.current) {
                characterPosition = useStore.getState().characterPosition
                if (characterPosition) {
                targetObject.position.set(characterPosition.x, characterPosition.y , characterPosition.z)
                characterLightRef.current.position.set(characterPosition.x - 2, characterPosition.y + 4, characterPosition.z + 3)
                characterLightRef.current.target = targetObject
                characterLightRef.current.shadow.camera.target = targetObject
                }
            }
        })


    const keyLightControls = useControls("KeyLight", {
        intensity: { value:0, min: 0, max: 50, step: 0.1 },
        // intensity: { value:29.5, min: 0, max: 50, step: 0.1 },
        color: "#3a62c8",
        position: { value: [-6.5, 3.8, 4.8], step: 1 }
    });
    
    const fillLightControls = useControls("FillLight", {
        intensity: { value: 1.8, min: 0, max: 50, step: 0.1 },
        color: "#2f4b90",
        position: { value: [20, 15, -22], step: 1 },
    });

    const backLightControls = useControls("BackLight", {
        intensity: { value: 1.2, min: 0, max: 50, step: 0.1 },
        color: "#49659d",
        position: { value: [-7, 15,-47 ], step: 1 },
    });

    const characterLightControls = useControls("CharacterLight", {
        intensity: { value: 4.7, min: 0, max: 50, step: 0.1 },
        color: "#3a62c8",
        position: { value: [0, 4, 2], step: 1 },
        bias: {value: -0.01, step: 0.00001}
    });
    
    const ambiantLightControls = useControls("AmbiantLight", {
        intensity: { value: 1.2, min: 0, max: 50, step: 0.1 },
        color: "#526cad",
    });

    return (
        <>

<directionalLight
                ref={characterLightRef}
                position={characterLightControls.position}
                intensity={characterLightControls.intensity}
                color={characterLightControls.color}
                castShadow
                shadow-mapSize={[64, 64]}
                // shadow-radius={2useStore.getState().characterPosition0}
                shadow-camera-near={1}
                shadow-camera-far={7}
                shadow-camera-top={1.5}
                shadow-camera-right={1}
                shadow-camera-bottom={-1}
                shadow-camera-left={-1}
                shadow-bias = {characterLightControls.bias}
            />

            <directionalLight
                ref={keyLightRef}
                position={keyLightControls.position}
                intensity={keyLightControls.intensity}
                color={keyLightControls.color}
                // castShadow
                // shadow-mapSize={[4096, 4096]}
                // // shadow-radius={20}
                // shadow-camera-near={1}
                // shadow-camera-far={40}
                // shadow-camera-top={25}
                // shadow-camera-right={2}
                // shadow-camera-bottom={-3}
                // shadow-camera-left={-70}
                // shadow-bias = {-0.01}
            />

            <directionalLight
            ref={fillLightRef}
                position={fillLightControls.position}
                intensity={fillLightControls.intensity}
                color={fillLightControls.color}
                target-position={[-18.5, 4, -36]}
            />
            {/* <directionalLight
                position={backLightControls.position}
                intensity={backLightControls.intensity}
                color={backLightControls.color}
            /> */}
              <directionalLight
                ref={backLightRef}
                position={[-7, 15,-47 ]}
                intensity={backLightControls.intensity}
                color={backLightControls.color}
                target-position={[-9.7, 8, -59]}
            />
            <ambientLight
                intensity={ambiantLightControls.intensity}
                color={ambiantLightControls.color}
            />  
        </>
    );
}
