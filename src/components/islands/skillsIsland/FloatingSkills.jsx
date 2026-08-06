import { useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';

import floatingSkillsVertexShader from '#shaders/floatingSkills/vertex.glsl';
import floatingSkillsFragmentShader from '#shaders/floatingSkills/fragment.glsl';

const FLOATING_SKILLS_COLOR = '#e1754b';
const FLOATING_SKILLS_INTENSITY = 9.87;

const FloatingSkills = props => {
  const { island } = props;

  const floatingSkillsShaderMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uOpacity: { value: 0 },
          uTexture: { value: island.materials.magicLetters.map },
          uColor: { value: new THREE.Color(FLOATING_SKILLS_COLOR) },
          uIntensity: { value: FLOATING_SKILLS_INTENSITY },
        },
        vertexShader: floatingSkillsVertexShader,
        fragmentShader: floatingSkillsFragmentShader,
        side: THREE.DoubleSide,
        transparent: true,
        toneMapped: false,
        // Keep the letters out of the depth buffer so N8AO (which samples
        // depth) doesn't darken around them while they are transparent
        depthWrite: false,
      }),
    [island]
  );

  useControls(
    'FloatingSkills',
    {
      color: {
        value: FLOATING_SKILLS_COLOR,
        onChange: value => {
          floatingSkillsShaderMaterial.uniforms.uColor.value.set(value);
        },
      },
      intensity: {
        value: FLOATING_SKILLS_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => {
          floatingSkillsShaderMaterial.uniforms.uIntensity.value = value;
        },
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    let floatingSkillsActivation = gsap.to(
      floatingSkillsShaderMaterial.uniforms.uOpacity,
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
      (floatingSkillsShaderMaterial.uniforms.uTime.value =
        state.clock.elapsedTime)
  );

  return (
    <skinnedMesh
      name="island_11"
      geometry={island.nodes.island_11.geometry}
      material={floatingSkillsShaderMaterial}
      skeleton={island.nodes.island_11.skeleton}
      morphTargetDictionary={island.nodes.island_11.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_11.morphTargetInfluences}
    />
  );
};

export { FloatingSkills };
