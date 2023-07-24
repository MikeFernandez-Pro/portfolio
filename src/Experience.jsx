import { SoftShadows, BakeShadows, OrbitControls, Environment } from "@react-three/drei";
import { Perf } from "r3f-perf";
import { Physics, Debug } from "@react-three/rapier";
import Lights from "./Lights.jsx";
import { useControls } from "leva";
import { useEffect, useRef, useState } from "react";
import Player from "./CharacterController.jsx";
import Island from "./Island.jsx";
import { Suspense } from "react";
import Sea from "./LavaMesh.jsx";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";

export default function Experience({ joystickAngle, mousePressed }) {
    const { orbitControls, debug } = useControls("Debug", {
        orbitControls: false,
        debug: false,
    });

    const { scene } = useThree();

    const envMap = useLoader(THREE.TextureLoader, '/environmentMaps/envMap.jpg')
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    scene.background = envMap;
    
    const orbitControlsRef = useRef();
    const [islandComponentMounted, setIslandComponentMounted] = useState(false);

    // useEffect(() => {
    //     orbitControlsRef.current.enablePan = false;
    //     orbitControlsRef.current.minDistance = 1;
    //     orbitControlsRef.current.maxDistance = 5;
    //     orbitControlsRef.current.minAzimuthAngle = -Math.PI / 2;
    //     orbitControlsRef.current.maxAzimuthAngle = Math.PI / 2;
    // }, [])
    // scene.backgroundIntensity = 1

    const softShadowsControls = useControls("SoftShadows", {
        size: { value: 20, step: 0.1 },
        samples: { value: 15, step: 0.1 },
    });
    return (
        <>
            <Perf position="top-left" />

            {orbitControls && <OrbitControls ref={orbitControlsRef} makeDefault />}

            {/* <Environment
                        //  background
                        // files="/environmentMaps/sky_floating_islands_composed_of_rocks_and_trees.hdr"
                        preset="forest"
                        blur={0.03}
                        /> */}

            <SoftShadows
                size={15}
                samples={30}
            />
            <Physics timeStep="vary">
                {debug && <Debug />}
                <Lights />
                <Island
                    setIslandComponentMounted={setIslandComponentMounted}
                />

                {islandComponentMounted && (
                    <Player
                        orbitControls={orbitControls}
                        joystickAngle={joystickAngle}
                        mousePressed={mousePressed}
                    />
                )}
            </Physics>
            {/* <Sea /> */}
        </>
    );
}
