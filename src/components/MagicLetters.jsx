import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { useStore } from "../store/ZustandStorage.jsx";
import * as THREE from "three";
import gsap from "gsap";

import floatingTextVertexShader from "../shaders/floatingText/vertex.glsl";
import floatingTextFragmentShader from "../shaders/floatingText/fragment.glsl";
import { useGSAP } from "@gsap/react";

const MagicLetters = ({ magicLetters, island }) => {
  const magicLettersShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
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
      }),
    []
  );

  useGSAP((context, contextSafe) => {
    // Replace magicLetters default material with new shader material
    magicLetters.material.dispose();
    magicLetters.material = magicLettersShaderMaterial;

    const magicLettersActivation = contextSafe(() => {
      gsap.to(magicLetters.material.uniforms.uOpacity, {
        duration: 1,
        delay: 1,
        value: 1,
        ease: "expo.in",
      });
    });

    // Subscribe to the magic glyph zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      (state) => state.magicGlyphActivation,
      (magicGlyphActivation) => {
        magicLettersActivation();
      }
    );

    // Clear subscriptions on unmount
    return () => {
      unsubMagicGlyphActivation();
    };
  }, []);

  // Update shader material uTime uniforms value over time
  useFrame(
    (state) =>
      (magicLetters.material.uniforms.uTime.value = state.clock.elapsedTime)
  );
};

export default MagicLetters;
