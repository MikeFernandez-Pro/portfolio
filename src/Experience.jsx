import { Box, OrbitControls, useDetectGPU } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
import { useLayoutEffect, useRef, useMemo, useEffect } from "react";
import CharacterController from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import IslandColliders from "./IslandColliders.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";
import FireFlies from "./FireFlies.jsx";
import TorchesSparks from "./TorchSparks/TorchesSparks.jsx";
import Smoke from "./Smoke.jsx";
import SampledGrass from "./SampledGrass.jsx";
import { useStore } from "./ZustandStorage.jsx";
import { useGSAP } from "@gsap/react";
import Clouds from "./Clouds.jsx";
import Lights from "./Lights.jsx";
import Joystick from "./Joystick.jsx";
import gsap from "gsap";

const AMBIANT_SOUND_VOLUME = 0.10;

// Music by Aleksey Chistilin
// https://pixabay.com/fr/users/lexin_music-28841948/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=116199
const ambientSound = new Audio("sounds/ambientMusic.mp3");
ambientSound.loop = true;
ambientSound.volume = 0;

const Experience = () => {

    const scene = useThree((state) => state.scene);

    const envMap = useLoader(THREE.TextureLoader, "/environmentMaps/envMap.webp");
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;
    scene.environment = envMap;

    useEffect(() => {
        const unsubExperienceStarted = useStore.subscribe(
            (state) => state.experienceStarted,
            (experienceStarted) => {
                if (experienceStarted) {
                    gsap.to(ambientSound, { volume: AMBIANT_SOUND_VOLUME, duration: 2 });
                    ambientSound.play();
                }
            }
        );


        const unsubSoundActivated = useStore.subscribe(
            (state) => state.soundActivated,
            (soundActivated) => {
                ambientSound.volume = soundActivated ? AMBIANT_SOUND_VOLUME : 0;

            }
        );

        return () => {
            unsubSoundActivated();
            unsubExperienceStarted();
        }
    }, []); 


    return (
        <>

            <Joystick />
            {/* <Perf position="top-left" /> */}

            <Clouds />

            <Lights />


            <SampledGrass />


            <FireFlies />

            <Smoke />

            <TorchesSparks />

            <ProjectsPortals />

                <Island />
            <Physics timeStep="vary" gravity={[0, -29.43, 0]}>
                <IslandColliders />
                <CharacterController />
            </Physics>
        </>
    );
};

export default Experience;
