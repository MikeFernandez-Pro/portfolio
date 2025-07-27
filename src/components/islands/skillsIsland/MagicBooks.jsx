import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
import gsap from 'gsap';
import { useStore } from '#store/ZustandStorage.jsx';

import magicBooksVertexShader from '#shaders/magicBooks/vertex.glsl';
import magicBooksFragmentShader from '#shaders/magicBooks/fragment.glsl';

const MagicBooks = props => {
  const { island } = props;

  useEffect(() => {
    const magicBooks = island.scene.children[0].children[0].children[9];

    // Replace magsaicBooks default material with shader material
    const magicBooksShaderMaterial = new CustomShaderMaterial({
      baseMaterial: magicBooks.material,
      vertexShader: magicBooksVertexShader,
      fragmentShader: magicBooksFragmentShader,
      uniforms: {
        uColor: {
          value: new THREE.Color('#ff4d00').multiplyScalar(32.5),
        },
        uProgress: { value: 2.5 },
      },
      toneMapped: false,
      transparent: true,
    });

    magicBooks.material?.dispose();
    magicBooks.material = magicBooksShaderMaterial;

    let magicBookAnimation = gsap.to(magicBooks.material.uniforms.uProgress, {
      duration: 3.5,
      delay: 0.4,
      value: 4,
      paused: true,
    });

    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicPlateActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => {
        magicBookAnimation.play();
      }
    );

    // Clear subscriptions on unmount
    return () => {
      magicBookAnimation.kill();
      magicBookAnimation = null;
      unsubMagicPlateActivation();
    };
  }, [island]);
};

export { MagicBooks };
