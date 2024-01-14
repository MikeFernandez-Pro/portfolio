import { Box, OrbitControls, useDetectGPU } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import {useLayoutEffect, useRef, useMemo } from "react";
import Player from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import IslandColliders from "./IslandColliders.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";
import FireFlies from "./FireFlies.jsx";
import gsap from "gsap";
import TorchesSparks from "./TorchSparks/TorchesSparks.jsx";
import Smoke from "./Smoke.jsx";
import SampledGrass from "./sampledGrass.jsx";
import { useStore } from "./ZustandStorage.jsx";
    
const Experience = () => {
    const { orbitControlsActivation } = useControls("Controls", {
        orbitControlsActivation: false
    });
    
    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);

    const gpuTier = useDetectGPU();

    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.webp')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;
    scene.environment = envMap;

    const orbitControlsRef = useRef();
    const isMobile = useStore(state => state.isMobile);


    // Music by Aleksey Chistilin
    // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
    const ambientSound = useMemo(() => {
        const audio = new Audio("sounds/ambientMusic.mp3")
        audio.loop = true;
        audio.volume = 0;
        return audio;
    }, []);


    const planeRef = useRef();
    useLayoutEffect(() => {
        // ambientSound.play();
        gsap.to(ambientSound, { volume: 0.15, duration: 3 })


    }, [])


    return (
        <>
            <Perf position="top-left" />

            {orbitControlsActivation && <OrbitControls ref={orbitControlsRef} camera={camera} />}

            <Lights />

            <SampledGrass />
            <Island />

            <FireFlies />

            <Smoke />

            <TorchesSparks />

            <ProjectsPortals />

            <Physics timeStep="vary" gravity={[0, -50, 0]}>
                <IslandColliders />
                <Player
                    orbitControls={orbitControlsActivation}
                />
            </Physics>
        </>
    );
}

export default Experience;
