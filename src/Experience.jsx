import { SoftShadows, BakeShadows, OrbitControls, Environment, MeshPortalMaterial, Html, ContactShadows, Circle, AccumulativeShadows, RandomizedLight } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics, useRapier } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import { useEffect, useRef } from "react";
import Player from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { Suspense } from "react";
import Sea from "./LavaMesh.jsx";
import { useFrame, useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import IslandColliders from "./IslandColliders.jsx";
import ProjectsPortals from "./ProjectsPortals.jsx";

export default function Experience({ joystickAngle }) {
    const { debug, orbitControlsActivation, envMapColor } = useControls("Controls", {
        debug: false,
        orbitControlsActivation: false,
        envMapColor: "blue"
    });

    const { scene, camera } = useThree();

    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.jpg')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;

    const orbitControlsRef = useRef();


    const softShadowsControls = useControls("SoftShadows", {
        size: { value: 20, step: 0.1 },
        samples: { value: 15, step: 0.1 },
    });
    
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
         
            <Lights />

            <Island />

            <ProjectsPortals />

            <Physics timeStep="vary" debug={debug} gravity={[0, -50, 0]}>
                <IslandColliders />
                <Player
                    orbitControls={orbitControlsActivation}
                    joystickAngle={joystickAngle}
                />
            </Physics>
        </>
    );
}
