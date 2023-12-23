import { useContext, useLayoutEffect, useMemo } from "react";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";

import animatedFlagVertexShader from "./shaders/animatedFlag/vertex.glsl";
import animatedFlagFragmentShader from "./shaders/animatedFlag/fragment.glsl";
import { useFrame } from "@react-three/fiber";
import {useControls} from "leva";

const AnimatedFlag = ({ flag, offset }) => {

    const {uOffset} = useControls("flag", {
        uOffset: {value: 0.0, min: -50.0, max: 50.0, step: 0.01}
    })

    const animatedFlagBaseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: flag.material.map
    }), []);

    const animatedFlagShaderMaterial = useMemo(() => new CustomShaderMaterial({
        baseMaterial: animatedFlagBaseMaterial,
        vertexShader: animatedFlagVertexShader,
        fragmentShader: animatedFlagFragmentShader,
        silent: true, // Disables the default warning if true
        uniforms: {
            uTime: { value: 0.0 },
            uOffset: { value: uOffset },
        }
    }), []);

    useLayoutEffect(() => {
        flag.material = animatedFlagShaderMaterial;
        flag.frustrumCulled = false
    }, []);

    useFrame(({ clock }) => {
        flag.material.uniforms.uTime.value = clock.elapsedTime;
        flag.material.uniforms.uOffset.value = uOffset;
    });

};


export default AnimatedFlag;
