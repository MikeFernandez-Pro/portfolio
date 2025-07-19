import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store/ZustandStorage.jsx';
import * as THREE from 'three';
import gsap from 'gsap';

import floatingSkillsVertexShader from '../shaders/floatingSkills/vertex.glsl';
import floatingSkillsFragmentShader from '../shaders/floatingSkills/fragment.glsl';

const FloatingSkills = props => {
  const { island } = props;

  const floatingSkills = useMemo(
    () => island.scene.children[0].children[0].children[10],
    [island]
  );

  useEffect(() => {
    const floatingSkillsShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uTexture: { value: floatingSkills.material.map },
        uColor: { value: new THREE.Color('#e1754b') },
        uIntensity: { value: 6.8 },
      },
      vertexShader: floatingSkillsVertexShader,
      fragmentShader: floatingSkillsFragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      toneMapped: false,
    });

    // Replace magicLetters default material with new shader material
    floatingSkills.material.dispose();
    floatingSkills.material = floatingSkillsShaderMaterial;

    let floatingSkillsActivation = gsap.to(
      floatingSkills.material.uniforms.uOpacity,
      {
        duration: 1,
        delay: 1,
        value: 1,
        ease: 'expo.in',
        paused: true,
      }
    );

    // Subscribe to the magic glyph zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => {
        floatingSkillsActivation.play();
      }
    );

    // Clear subscriptions on unmount
    return () => {
      floatingSkillsActivation?.kill();
      floatingSkillsActivation = null;
      unsubMagicGlyphActivation();
    };
  }, []);

  // Update shader material uTime uniforms value over time
  useFrame(
    state =>
      (floatingSkills.material.uniforms.uTime.value = state.clock.elapsedTime)
  );
};

export { FloatingSkills };
