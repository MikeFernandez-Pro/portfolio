import { SoftShadows, BakeShadows, OrbitControls, Environment, MeshPortalMaterial, Html, ContactShadows, Circle} from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics } from "@react-three/rapier";
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
import gsap from "gsap";
import ProjectsPortals from "./ProjectsPortals.jsx";

export default function Experience({ joystickAngle }) {
    const { debug, orbitControlsActivation } = useControls("Controls", {
        debug: false,
        orbitControlsActivation: false,
    });

    const { scene } = useThree();

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



    return (
        <>
            <Perf position="top-left" />

            { orbitControlsActivation && <OrbitControls ref={orbitControlsRef} makeDefault /> }
            
            {/* <SoftShadows
                size={15}
                samples={30}
            /> */}
            <BakeShadows />
            <Lights />

            <Island
                setIslandComponentMounted={setIslandComponentMounted}
            />


        <ProjectsPortals />

            <Physics timeStep="vary" debug={debug}>
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
