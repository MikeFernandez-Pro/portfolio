import { useMemo, useEffect } from 'react';
import CustomShaderMaterial from 'three-custom-shader-material/vanilla';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';

import magicBooksVertexShader from '#shaders/magicBooks/vertex.glsl';
import magicBooksFragmentShader from '#shaders/magicBooks/fragment.glsl';

const MagicBooks = props => {
  const { island } = props;

  const magicBooksShaderMaterial = useMemo(
    () =>
      // CSM patches the base material instance in place, so clone the shared
      // GLB material to keep the original pristine (StrictMode/HMR safe)
      new CustomShaderMaterial({
        baseMaterial: island.materials.magicBooks.clone(),
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
      }),
    [island]
  );

  useEffect(() => {
    let magicBookAnimation = gsap.to(
      magicBooksShaderMaterial.uniforms.uProgress,
      {
        duration: 3.5,
        delay: 0.4,
        value: 4,
        paused: true,
      }
    );

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
  }, []);

  return (
    <skinnedMesh
      name="island_10"
      geometry={island.nodes.island_10.geometry}
      material={magicBooksShaderMaterial}
      skeleton={island.nodes.island_10.skeleton}
      morphTargetDictionary={island.nodes.island_10.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_10.morphTargetInfluences}
    />
  );
};

export { MagicBooks };
