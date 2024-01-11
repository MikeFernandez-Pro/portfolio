import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";

import smokeVertexShader from "/shaders/smoke/vertex.glsl";
import smokeFragmentShader from "/shaders/smoke/fragment.glsl";

const Smoke = () => {

    const smokeRef = useRef()

    const SmokeShaderMaterial = shaderMaterial({
        uTime: 0,
        uColor: new THREE.Color("#313131"),
        uDisplacementUv: 2.8,
        uDisplacementUvY: 1.6,
        newPositionY: 1.69,
    },
        smokeVertexShader,
        smokeFragmentShader,
    );

    extend({ SmokeShaderMaterial })

    useFrame(({ clock }) => {
        smokeRef.current.uniforms.uTime.value = clock.elapsedTime;
    })

    return (
            <mesh position={[-1.55, 6.8, -55.89]} rotation={[0, 0, -0.30]}>
                <planeGeometry attach="geometry" args={[0.3, 10, 16, 128]} />
                <smokeShaderMaterial ref={smokeRef} transparent depthWrite={false} />
            </mesh>
    );
};

export default Smoke;