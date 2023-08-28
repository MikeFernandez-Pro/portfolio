import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useControls, button } from "leva";
import { useThree } from "@react-three/fiber";
import { useHelper } from "@react-three/drei";

export default function Lights() {
    const keyLightRef = useRef();
    const [shadowCameraHelper, setShadowCameraHelper] = useState(false);

    const { scene } = useThree();

    const keyLightControls = useControls("KeyLight", {
        intensity: { value: 27.3, min: 0, max: 100, step: 0.1 },
        color: "#3a62c8",
        position: { value: [-6.5, 3.8, 4.8], step: 1 }
    });

    const fillLightControls = useControls("FillLight", {
        intensity: { value: 2.6, min: 0, max: 100, step: 0.1 },
        color: "#526cad",
        position: { value: [22, 15, -48], step: 1 },
    });

    const backLightControls = useControls("BackLight", {
        intensity: { value: 1.3, min: 0, max: 100, step: 0.1 },
        color: "#4b6eb4",
        position: { value: [-7, 4, 9], step: 1 },
    });

    const ambiantLightControls = useControls("AmbiantLight", {
        intensity: { value: 0.81, min: 0, max: 100, step: 0.001 },
        color: "#526cad",
    });

    return (
        <>
            <directionalLight
                ref={keyLightRef}
                position={keyLightControls.position}
                intensity={keyLightControls.intensity}
                color={keyLightControls.color}
                castShadow
                shadow-mapSize={[4096, 4096]}
                // shadow-radius={10000}
                shadow-camera-near={1}
                shadow-camera-far={40}
                shadow-camera-top={25}
                shadow-camera-right={2}
                shadow-camera-bottom={-3}
                shadow-camera-left={-70}
                shadow-bias = {-0.01}
            />

            <directionalLight
                position={fillLightControls.position}
                intensity={fillLightControls.intensity}
                color={fillLightControls.color}
            />
            <directionalLight
                position={backLightControls.position}
                intensity={backLightControls.intensity}
                color={backLightControls.color}
            />
            <ambientLight
                intensity={ambiantLightControls.intensity}
                color={ambiantLightControls.color}
            />  
        </>
    );
}
