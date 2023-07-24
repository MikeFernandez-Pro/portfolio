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
        intensity: { value: 6.2, min: 0, max: 10, step: 0.1 },
        color: "#4167c7",
        position: { value: [-6.5, 3.8, 4.8], step: 1 }
    });

    const fillLightControls = useControls("FillLight", {
        intensity: { value: 1.7, min: 0, max: 10, step: 0.1 },
        color: "#526cad",
        position: { value: [22, 15, -48], step: 1 },
    });

    const backLightControls = useControls("BackLight", {
        intensity: { value: 1, min: 0, max: 10, step: 0.1 },
        color: "#4b6eb4",
        position: { value: [-7, 4, 9], step: 1 },
    });

    const ambiantLightControls = useControls("AmbiantLight", {
        intensity: { value: 1.4, min: 0, max: 2, step: 0.001 },
        color: "#526cad",
    });

    return (
        <>
            <directionalLight
                ref={keyLightRef}
                castShadow
                position={keyLightControls.position}
                intensity={keyLightControls.intensity}
                shadow-mapSize={[2048, 2048]}
                shadow-radius={10}
                shadow-camera-near={1}
                shadow-camera-far={40}
                shadow-camera-top={25}
                shadow-camera-right={2}
                shadow-camera-bottom={-3}
                shadow-camera-left={-70}
                color={keyLightControls.color}
                // shadow-normalBias={0.1}
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
