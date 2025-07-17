import CustomShaderMaterial from "three-custom-shader-material/vanilla";
import * as THREE from "three";
import { useLayoutEffect, useMemo } from "react";
import gsap from "gsap";
import { useStore } from "../../store/ZustandStorage.jsx";

import magicBooksVertexShader from "../../shaders/magicBooks/vertex.glsl";
import magicBooksFragmentShader from "../../shaders/magicBooks/fragment.glsl";

const MagicBooks = ({ magicBooks }) => {
  const magicBooksShaderMaterial = useMemo(
    () =>
      new CustomShaderMaterial({
        baseMaterial: magicBooks.material,
        vertexShader: magicBooksVertexShader,
        fragmentShader: magicBooksFragmentShader,
        silent: true,
        uniforms: {
          uColor: {
            value: new THREE.Color("#ff4d00").multiplyScalar(32.5),
          },
          uProgress: { value: 2.5 },
        },
        toneMapped: false,
        transparent: true,
      }),
    []
  );

  useLayoutEffect(() => {
    // Replace magsaicBooks default material with shader material
    magicBooks.material = magicBooksShaderMaterial;

    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicPlateActivation = useStore.subscribe(
      (state) => state.magicGlyphActivation,
      () => {
        gsap.to(magicBooks.material.uniforms.uProgress, {
          duration: 3.5,
          delay: 0.4,
          value: 4,
        });
      }
    );

    // Clear subscriptions on unmount
    return () => {
      unsubMagicPlateActivation();
    };
  }, []);
};

export { MagicBooks };
