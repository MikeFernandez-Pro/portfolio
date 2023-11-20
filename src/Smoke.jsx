import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { useControls } from "leva";
import { useRef } from "react";
import * as THREE from "three";

import smokeVertexShader from "/shaders/smoke/vertex.glsl";
import smokeFragmentShader from "/shaders/smoke/fragment.glsl";

const Smoke = (props) => {

    const smokeRef = useRef()

    const controls = useControls("Smoke", {
        position: { value: [-1.1, 8.2, -55.8], step: 0.1 },
        rotation: { value: [0, 0, -0.30], step: 0.01 },
        timeMultiplier: { value: 1, min: 0, max: 1, step: 0.001 },
        xMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
        yMultiplier: { value: 1, min: 0, max: 5, step: 0.1 },
        xBorderAlpha: { value: 30, min: 0, max: 50, step: 0.1 },
        yBorderAlpha: { value: 30, min: 0, max: 50, step: 0.1 },
        uColor: "#313131",
        vertexNoiseMultiplier: { value: 0.1, min: 0, max: 5, step: 0.1 },
        uDisplacementUv: { value: 3.5, min: 0, max: 50, step: 0.1 },
        uDisplacementUvY: { value: 30, min: 0, max: 50, step: 0.1 },
        udisplacementStrength1: { value: 30, min: 0, max: 50, step: 0.1 },
        displacementStrength2: { value: 30, min: 0, max: 50, step: 0.1 },
        newPositionY: { value: 1.69, min: 0, max: 30, step: 0.001 },
    })
    
    const {chemineyPos, chemineyRot, chemineyScale} = useControls("Cheminey", {
        chemineyPos: {value: [-7.72, 7.17, -14.25], step: 0.01},
        chemineyRot: {value: [0, 0.8, 0], step: 0.1},
        chemineyScale: {value: [0.4, 1, 1], step: 0.1},
    })

    const SmokeShaderMaterial = shaderMaterial({
        uTime: 0,
        timeMultiplier: controls.timeMultiplier,
        xMultiplier: controls.xMultiplier,
        yMultiplier: controls.yMultiplier,
        xBorderAlpha: controls.xBorderAlpha,
        yBorderAlpha: controls.yBorderAlpha,
        uColor: new THREE.Color(controls.uColor),
        vertexNoiseMultiplier: controls.vertexNoiseMultiplier,
        uDisplacementUv: controls.uDisplacementUv,
        uDisplacementUvY: controls.uDisplacementUvY,
        udisplacementStrength1: controls.udisplacementStrength1,
        displacementStrength2: controls.displacementStrength2,
        newPositionY: controls.newPositionY,
    },
        smokeVertexShader,
        smokeFragmentShader,
    );

    extend({ SmokeShaderMaterial })

    useFrame(({ clock }) => {
        smokeRef.current.uniforms.uTime.value = clock.elapsedTime;
        smokeRef.current.uniforms.xMultiplier.value = controls.xMultiplier;
        smokeRef.current.uniforms.yMultiplier.value = controls.yMultiplier;
        smokeRef.current.uniforms.timeMultiplier.value = controls.timeMultiplier;
        smokeRef.current.uniforms.xBorderAlpha.value = controls.xBorderAlpha;
        smokeRef.current.uniforms.yBorderAlpha.value = controls.yBorderAlpha;
        smokeRef.current.uniforms.uColor.value = new THREE.Color(controls.uColor);
        smokeRef.current.uniforms.vertexNoiseMultiplier.value = controls.vertexNoiseMultiplier;
        smokeRef.current.uniforms.uDisplacementUv.value = controls.uDisplacementUv;
        smokeRef.current.uniforms.uDisplacementUvY.value = controls.uDisplacementUvY;
        smokeRef.current.uniforms.udisplacementStrength1.value = controls.udisplacementStrength1;
        smokeRef.current.uniforms.displacementStrength2.value = controls.displacementStrength2;
        smokeRef.current.uniforms.newPositionY.value = controls.newPositionY;
    })

    return (
        <>
            <mesh position={controls.position} rotation={controls.rotation}>
                <planeGeometry attach="geometry" args={[0.4, 5, 16, 128]} />
                <smokeShaderMaterial ref={smokeRef} transparent depthWrite={false} />
            </mesh>
            {/* <mesh position={chemineyPos} scale={chemineyScale} rotation={chemineyRot}>
                <planeGeometry attach="geometry" args={[0.4, 5, 16, 128]} />
                <smokeShaderMaterial ref={smokeRef} transparent depthWrite={false} />
            </mesh> */}
        </>
    );
};

export default Smoke;