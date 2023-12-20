import { useLayoutEffect, useMemo } from "react";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";

import animatedFlagVertexShader from "./shaders/animatedFlag/vertex.glsl";
import animatedFlagFragmentShader from "./shaders/animatedFlag/fragment.glsl";
import { useFrame } from "@react-three/fiber";

const AnimatedFlag = ({ flag, offset }) => {

    const animatedFlagBaseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: flag.material.map
    }), []);

    const animatedFlagShaderMaterial = useMemo(() => new CustomShaderMaterial({
        baseMaterial: animatedFlagBaseMaterial,
        vertexShader: animatedFlagVertexShader,
        // fragmentShader: animatedFlagFragmentShader,
        silent: true, // Disables the default warning if true
        uniforms: {
            uTime: { value: 0.0 },
            uOffset: { value: offset },
        }
    }), []);

    useLayoutEffect(() => {
        flag.material = animatedFlagShaderMaterial
        // flag.material.wireframe = true;
    }, []);

    useFrame(({ clock }) => {
        flag.material.uniforms.uTime.value = clock.elapsedTime;
    });

};


export default AnimatedFlag;
