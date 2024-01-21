import { useEffect, useLayoutEffect, useMemo, useRef} from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useHelper } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import * as THREE from "three";
import { useControls } from "leva";

 const Lights = () => {

    const isMobile = useStore(state => state.isMobile);

    const fillLightControls = useControls("FillLight", {
        intensity: { value: 11, min: 0, max: 50, step: 0.1 },
        color: "#2f4b90",
        position: { value: [20, 15, -22], step: 1 },
    });

    const backLightControls = useControls("BackLight", {
        intensity: { value: 1.2, min: 0, max: 50, step: 0.1 },
        color: "#49659d",
        position: { value: [-7, 15, -47], step: 1 },
    });

    const characterLightControls = useControls("CharacterLight", {
        intensity: { value: 10, min: 0, max: 50, step: 0.1 },
        color: "#3a62c8",
        position: { value: [-3, 4, 3], step: 1 },
        bias: { value: -0.01, step: 0.001 }
    });

    const ambiantLightControls = useControls("AmbiantLight", {
        intensity: { value: 1.2, min: 0, max: 50, step: 0.1 },
        color: "#526cad",
    });

    const pointLightControls = useControls("PointLight", {
        intensity: { value: 45.0, min: 0, max: 50, step: 0.1 },
        color: "#ad7351",
    });

    
    const fillLightRef = useRef();
    const backLightRef = useRef();
    const characterLightRef = useRef();
    const pointLightRef = useRef();

    const characterLightHelper = useHelper(characterLightRef, THREE.DirectionalLightHelper, 0)
    const fillLighHelper = useHelper(fillLightRef, THREE.DirectionalLightHelper, 0)
    const backLightHelper = useHelper(backLightRef, THREE.DirectionalLightHelper, 0)

    const scene = useThree(state => state.scene);
    const targetObject = useMemo(() => new THREE.Object3D(), []);

   

    useLayoutEffect(() => {
        const unsubCharacterPosition = isMobile ? undefined : useStore.subscribe(
            state => state.characterPosition,
            (characterPosition) => {
                if (characterPosition && characterLightRef.current) {
                    targetObject.position.set(characterPosition.x, characterPosition.y, characterPosition.z)
                    characterLightRef.current.position.set(characterPosition.x - 3, characterPosition.y + 4, characterPosition.z + 3)
                    characterLightRef.current.target = targetObject
                    characterLightRef.current.shadow.camera.target = targetObject
                }
            }
        )

        characterLightHelper.current.targetLine.geometry.drawRange.count = 0;
        fillLighHelper.current.targetLine.geometry.drawRange.count = 0;
        backLightHelper.current.targetLine.geometry.drawRange.count = 0;

        scene.add(targetObject)

        return () => {
            scene.remove(targetObject)
            
            if (isMobile) return;
            
            unsubCharacterPosition();
        }
    }, [])


    return (
        <>
            <ambientLight
                intensity={ambiantLightControls.intensity}
                color={ambiantLightControls.color}
            />
            <directionalLight
                ref={characterLightRef}
                position={characterLightControls.position}
                intensity={characterLightControls.intensity}
                color={characterLightControls.color}
                castShadow={!isMobile}
                shadow-mapSize={[256, 256]}
                shadow-camera-near={1}
                shadow-camera-far={10}
                shadow-camera-top={1.5}
                shadow-camera-right={1}
                shadow-camera-bottom={-1}
                shadow-camera-left={-1}
                shadow-bias={characterLightControls.bias}
            />

            <directionalLight
                ref={fillLightRef}
                position={fillLightControls.position}
                intensity={fillLightControls.intensity}
                color={fillLightControls.color}
                target-position={[-18.5, 4, -36]}
            />
            <directionalLight
                ref={backLightRef}
                position={[-7, 15, -47]}
                intensity={backLightControls.intensity}
                color={backLightControls.color}
                target-position={[-9.7, 8, -59]}
            />

<pointLight
                ref={pointLightRef}
                position={[-9.7, 12, -59.5]}
                intensity={pointLightControls.intensity}
                color={pointLightControls.color}
            />

        </>
    );
}

export default Lights;