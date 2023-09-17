import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useControls, button } from "leva";
import { useThree } from "@react-three/fiber";
import { useHelper } from "@react-three/drei";

export default function Lights() {
    const keyLightRef = useRef();
    const  fillLightRef = useRef();
    const backLightRef = useRef();
 
    const keyLightHelper = useHelper(keyLightRef, THREE.DirectionalLightHelper, 0)
    const fillLighHelper = useHelper(fillLightRef, THREE.DirectionalLightHelper, 0)
    const backLightHelper = useHelper(backLightRef, THREE.DirectionalLightHelper, 0)

    if (keyLightHelper.current) {
        keyLightHelper.current.targetLine.geometry.setDrawRange(0, 0);
        fillLighHelper.current.targetLine.geometry.setDrawRange(0, 0);
        backLightHelper.current.targetLine.geometry.setDrawRange(0, 0);
    }




    const { scene } = useThree();

    const keyLightControls = useControls("KeyLight", {
        intensity: { value:24.5, min: 0, max: 50, step: 0.1 },
        color: "#3a62c8",
        position: { value: [-6.5, 3.8, 4.8], step: 1 }
    });
    
    const fillLightControls = useControls("FillLight", {
        intensity: { value: 2.3, min: 0, max: 50, step: 0.1 },
        color: "#526cad",
        position: { value: [20, 15, -22], step: 1 },
    });

    const backLightControls = useControls("BackLight", {
        intensity: { value: 8.2, min: 0, max: 50, step: 0.1 },
        color: "#6988c4",
        position: { value: [-7, 15,-47 ], step: 1 },
    });

    // if (backLightRef.current)
    // scene.add(new THREE.CameraHelper(backLightRef.current.shadow.camera))

    
    const ambiantLightControls = useControls("AmbiantLight", {
        intensity: { value: 8.2, min: 0, max: 50, step: 0.1 },
        color: "#526cad",
    });

    return (
        <>
            <directionalLight
                ref={keyLightRef}
                position={keyLightControls.position}
                intensity={keyLightControls.intensity}
                color={keyLightControls.color}
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
