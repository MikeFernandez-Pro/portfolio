import {OrbitControls, useProgress, Box } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics, useRapier } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import Player from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import IslandColliders from "./IslandColliders.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";
import FireFlies from "./FireFlies.jsx";
import gsap from "gsap";
import { useStore } from "./ZustandStorage.jsx";
import Ashes from "./Ashes.jsx";
import TorchesSparks from "./TorchSparks/TorchesSparks.jsx";
import Smoke from "./Smoke.jsx";

export default function Experience() {
    const { debug, orbitControlsActivation, envMapColor } = useControls("Controls", {
        debug: false,
        orbitControlsActivation: false,
        envMapColor: "blue"
    });

    let {position} = useControls("Cube", {
        position: {value :[-5.8 , 1.8, -10.8], step: 0.1}
    })

    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);

    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.jpg')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;
    // scene.environment = envMap;

    const orbitControlsRef = useRef();

    const loadingProgres = useProgress();

    // if (loadingProgres.loaded === 18)
    //     console.log(loadingProgres)

    const ambientSound = new Audio("sounds/ambientMusic.mp3")
    ambientSound.loop = true;
    ambientSound.volume = 0;

    useEffect(() => {
            // ambientSound.play();
            gsap.to(ambientSound, {volume: 0.15, duration: 3})
    }, [])

    const boxRef = useRef()
    let characterPosition = null;

    useFrame(() => {
        characterPosition = useStore.getState().characterPosition
        //  console.log(boxRef.current.position.distanceTo(characterPosition))

    })
    
    return (
        <>

            {/* <fog attach="fog" args={['white', 50, 190]} /> */}
            <Perf position="top-left" />

            {orbitControlsActivation && <OrbitControls ref={orbitControlsRef} camera={camera} />}

            {/* <SoftShadows size={ 10 } samples={ 10 } /> */}
            {/* <Environment preset="sunset">
            <color args={ [ envMapColor ] } attach="background" />
                </Environment> */}
            {/* <BakeShadows /> */}
         
            <Box ref={boxRef} position={position} scale={0.2}/>
         
            <Lights />

            <Island />

            <FireFlies />
            
            <Smoke />
            {/* <Ashes /> */}
            <TorchesSparks />

            <ProjectsPortals />

            <Physics timeStep="vary" debug={debug} gravity={[0, -50, 0]}>
                <IslandColliders />
                <Player
                    orbitControls={orbitControlsActivation}
                />
            </Physics>
        </>
    );
}
