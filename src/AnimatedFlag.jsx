import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";

import animatedFlagVertexShader from "./shaders/animatedFlag/vertex.glsl";
import animatedFlagFragmentShader from "./shaders/animatedFlag/fragment.glsl";


const AnimatedFlag = ({ flag }) => {

    const animatedFlagBaseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: flag.material.map
    }), [flag.material.map]);

    const animatedFlagShaderMaterial = useMemo(() => new CustomShaderMaterial({
        baseMaterial: animatedFlagBaseMaterial,
        vertexShader: animatedFlagVertexShader,
        fragmentShader: animatedFlagFragmentShader,
        silent: true, // Disables the default warning if true
        uniforms: {
            uTime: { value: 0.0 }
        }
    }), [animatedFlagBaseMaterial]);

    useLayoutEffect(() => {
        flag.material = animatedFlagShaderMaterial;
        flag.frustrumCulled = false
    }, [flag, animatedFlagShaderMaterial]);

    useFrame(({ clock }) => {
        flag.material.uniforms.uTime.value = clock.elapsedTime;
    });
};

export default AnimatedFlag;
