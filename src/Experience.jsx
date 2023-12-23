import { OrbitControls, useProgress, Box } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics, useRapier } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import { useEffect, useLayoutEffect, useRef, useMemo } from "react";
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
import SampledGrass from "./sampledGrass.jsx";


export default function Experience() {
    const { debug, orbitControlsActivation, envMapColor } = useControls("Controls", {
        debug: false,
        orbitControlsActivation: false,
        envMapColor: "blue"
    });

    let { position } = useControls("Cube", {
        position: { value: [-5.8, 1.8, -10.8], step: 0.01 }
    })

    const scene = useThree((state) => state.scene);
    const camera = useThree((state) => state.camera);


    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.webp')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;
    scene.environment = envMap;

    const orbitControlsRef = useRef();


    // Music by Aleksey Chistilin
    // https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
    const ambientSound = useMemo(() => {
        const audio = new Audio("sounds/ambientMusic.mp3")
        audio.loop = true;
        audio.volume = 0;
        return audio;
    }, []);

    useLayoutEffect(() => {
        ambientSound.play();
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
