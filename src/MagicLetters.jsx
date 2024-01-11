import { useLayoutEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "./ZustandStorage";
import * as THREE from "three"
import gsap from "gsap";

import floatingTextVertexShader from "/shaders/floatingText/vertex.glsl"
import floatingTextFragmentShader from "/shaders/floatingText/fragment.glsl"

const MagicLetters = ({ magicLetters, island }) => {

    const magicLettersShaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uOpacity: { value: 0 },
            uTexture: { value: island.material.map },
            uColor: { value: new THREE.Color("#e1754b") },
            uIntensity: { value: 6.8 },
        },
        vertexShader: floatingTextVertexShader,
        fragmentShader: floatingTextFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
    }), [])


    useLayoutEffect(() => {
        // Replace magicLetters default material with new shader material
        magicLetters.material = magicLettersShaderMaterial;

        // Subscribe to the magic glyph zustand store state
        const unsubMagicGlyphActivation = useStore.subscribe(
            (state) => state.magicGlyphActivation,
            (magicGlyphActivation) => {
                gsap.to(magicLetters.material.uniforms.uOpacity, { duration: 1, delay: 1, value: 1, ease: "expo.in" });
            }
        )

        // Clear subscriptions on unmount
        return () => {
            unsubMagicGlyphActivation();
        }
    }, [])

    // Update shader material uTime uniforms value over time
    useFrame(state =>
        magicLetters.material.uniforms.uTime.value = state.clock.elapsedTime
    )
};

export default MagicLetters;