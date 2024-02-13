import { useLayoutEffect, useMemo, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { useHelper } from "@react-three/drei";
import { useStore } from "./ZustandStorage";
import * as THREE from "three";

const isMobile = "ontouchstart" in window || navigator.maxTouchPoints > 0;

const Lights = () => {
    const fillLightRef = useRef();
    const backLightRef = useRef();
    const characterLightRef = useRef();
    const pointLightRef = useRef();

    const characterLightHelper = useHelper(characterLightRef, THREE.DirectionalLightHelper, 0);
    const fillLighHelper = useHelper(fillLightRef, THREE.DirectionalLightHelper, 0);
    const backLightHelper = useHelper(backLightRef, THREE.DirectionalLightHelper, 0);

    const scene = useThree((state) => state.scene);
    const targetObject = useMemo(() => new THREE.Object3D(), []);

    useLayoutEffect(() => {
        const unsubCharacterPosition = isMobile
            ? undefined
            : useStore.subscribe(
                  (state) => state.characterPosition,
                  (characterPosition) => {
                      if (characterPosition && characterLightRef.current) {
                          targetObject.position.set(
                              characterPosition.x,
                              characterPosition.y,
                              characterPosition.z
                          );
                          characterLightRef.current.position.set(
                              characterPosition.x - 3,
                              characterPosition.y + 4,
                              characterPosition.z + 3
                          );
                          characterLightRef.current.target = targetObject;
                          characterLightRef.current.shadow.camera.target = targetObject;
                      }
                  }
              );

        characterLightHelper.current.visible = false;
        fillLighHelper.current.visible = false;
        backLightHelper.current.visible = false;
        characterLightHelper.current.targetLine.geometry.drawRange.count = 0;
        fillLighHelper.current.targetLine.geometry.drawRange.count = 0;
        backLightHelper.current.targetLine.geometry.drawRange.count = 0;

        scene.add(targetObject);

        return () => {
            scene.remove(targetObject);

            if (isMobile) return;

            unsubCharacterPosition();
        };
    }, []);

    return (
        <>
            <ambientLight intensity={1.2} color="#526cad" />
            <directionalLight
                ref={characterLightRef}
                position={[-3, 4, 3]}
                intensity={11.5}
                color="#3a62c8"
                castShadow={!isMobile}
                shadow-mapSize={[256, 256]}
                shadow-camera-near={1}
                shadow-camera-far={10}
                shadow-camera-top={1.5}
                shadow-camera-right={1}
                shadow-camera-bottom={-1}
                shadow-camera-left={-1}
                shadow-bias={-0.01}
            />

            <directionalLight
                ref={fillLightRef}
                position={[20, 15, -22]}
                intensity={13}
                color="#2f4b90"
                target-position={[-18.5, 4, -36]}
            />
            <directionalLight
                ref={backLightRef}
                position={[-7, 15, -47]}
                intensity={1.2}
                color="#49659d"
                target-position={[-9.7, 8, -59]}
            />

            <pointLight
                ref={pointLightRef}
                position={[-9.7, 12, -59.5]}
                intensity={45}
                color="#ad7351"
            />
        </>
    );
};

export default Lights;
