import { SoftShadows, BakeShadows, OrbitControls, Environment, MeshPortalMaterial, Html, ContactShadows, Circle, AccumulativeShadows, RandomizedLight } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics, useRapier } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import Player from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { Suspense } from "react";
import Sea from "./LavaMesh.jsx";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import IslandColliders from "./IslandColliders.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";

export default function Experience({ joystickAngle }) {
    const { debug, orbitControlsActivation } = useControls("Controls", {
        debug: false,
        orbitControlsActivation: false,
    });

    const { scene, camera } = useThree();

    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.jpg')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;

    const orbitControlsRef = useRef();
    const [islandComponentMounted, setIslandComponentMounted] = useState(false);


    const softShadowsControls = useControls("SoftShadows", {
        size: { value: 20, step: 0.1 },
        samples: { value: 15, step: 0.1 },
    });

    // const {world} = useRapier();


    // useEffect(() => {
    //     world.integrationParameters.predictionDistance = 0.045;
    // }, [])

    return (
        <>

            {/* <fog attach="fog" args={['white', 50, 190]} /> */}
            <Perf position="top-left" />

            {orbitControlsActivation && <OrbitControls ref={orbitControlsRef} camera={camera} />}

            <SoftShadows size={ 5 } samples={ 10 } />
            <Environment preset="night"/>
            <BakeShadows />
         
            <Lights />

            <Island
                setIslandComponentMounted={setIslandComponentMounted}
            />

            <ProjectsPortals />

            <Physics timeStep="vary" debug={debug} gravity={[0, -50, 0]}>
                <IslandColliders />
                <Player
                    orbitControls={orbitControlsActivation}
                    joystickAngle={joystickAngle}
                    visible={islandComponentMounted}
                />
            </Physics>
        </>
    );
}
