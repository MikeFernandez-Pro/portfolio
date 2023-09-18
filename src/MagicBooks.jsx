import { useAnimations, useGLTF } from "@react-three/drei";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useEffect, useRef } from "react";
import { patchShaders } from "gl-noise";
import { useControls } from "leva";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";

import dissolveEffectVertexShader from './shaders/dissolveEffect/vertex.glsl'
import dissolveEffectFragmentShader from './shaders/dissolveEffect/fragment.glsl'

const MagicBooks = ({ magicBooks, texture }) => {

    const magicCircleActivationRef = useRef(useStore.getState().magicCircleActivation)

    const magicBooksMaterial = new THREE.MeshStandardMaterial({
        map: texture,
    })

    const controls = useControls("magicBooks", {
        intensity: { value: 20, min: 0, max: 50, step: 0.1 },
        color: "#0692c4",
        thickness: { value: 0.02, min: 0, max: 0.1, step: 0.001 },
    });

    const disolveEffectMaterial = new CustomShaderMaterial({
        baseMaterial: magicBooksMaterial,
        vertexShader: dissolveEffectVertexShader,
        fragmentShader: patchShaders(dissolveEffectFragmentShader),
        silent: true, // Disables the default warning if true
        uniforms: {
            uThickness: { value: controls.thickness },
            uColor: {
                value: new THREE.Color(controls.color).multiplyScalar(controls.intensity),
            },
            uProgress: { value: 0 },
        },
        toneMapped: false,
        transparent: true,
    });

    magicBooks.material = disolveEffectMaterial.clone();


    const magicCircleActivation = useStore(state => state.magicCircleActivation)

    if (magicCircleActivation) {
        gsap.to( magicBooks.material.uniforms.uProgress, { duration: 3, delay: 0.5, value: 1 });
    }
};


export default MagicBooks;
