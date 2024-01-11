import { useAnimations, useGLTF } from "@react-three/drei";
import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useLayoutEffect, useMemo } from "react";
import { patchShaders } from "gl-noise";
import gsap from "gsap";
import { useStore } from "./ZustandStorage";

import dissolveEffectVertexShader from './shaders/dissolveEffect/vertex.glsl'
import dissolveEffectFragmentShader from './shaders/dissolveEffect/fragment.glsl'

const MagicBooksShader = ({ magicBooks }) => {

    const magicBooksBaseMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        map: magicBooks.material.map
    }), []);

    const magicBooksShaderMaterial = useMemo(() => new CustomShaderMaterial({
        baseMaterial: magicBooksBaseMaterial,
        vertexShader: dissolveEffectVertexShader,
        fragmentShader: patchShaders(dissolveEffectFragmentShader),
        silent: true, // Disables the default warning if true
        uniforms: {
            uThickness: { value: 0.02 },
            uColor: {
                value: new THREE.Color("#ff4d00").multiplyScalar(32.5),
            },
            uProgress: { value: 0.2 },
        },
        toneMapped: false,
        transparent: true,
    }), []);

    useLayoutEffect(() => {
        // Replace magicBooks default material with shader material
        magicBooks.material = magicBooksShaderMaterial;

        // Subscribe to magicGlyphActivation zustand store state
        const unsubMagicPlateActivation = useStore.subscribe(
            (state) => state.magicGlyphActivation,
            (magicGlyphActivation) => {
                gsap.to(magicBooks.material.uniforms.uProgress, { duration: 8, delay: 0.4, value: 1 });
            }
        )

        // Clear subscriptions on unmount
        return () => {
            unsubMagicPlateActivation()
        }
    }, [])
};

export default MagicBooksShader;
