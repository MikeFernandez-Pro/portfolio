import { useMemo, useEffect } from 'react';
import { useControls } from '#utils/useControls.jsx';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';
import {
  cameraProjectionMatrix,
  cameraViewMatrix,
  modelWorldMatrix,
  positionGeometry,
  sin,
  texture,
  time,
  uniform,
  vec4,
} from 'three/tsl';

import { useStore } from '#store/ZustandStorage.jsx';

const FLOATING_SKILLS_COLOR = '#e1754b';
const FLOATING_SKILLS_INTENSITY = 9.87;

const FloatingSkills = props => {
  const { island } = props;

  const { floatingSkillsMaterial, uniforms } = useMemo(() => {
    const uniforms = {
      uOpacity: uniform(0),
      uColor: uniform(new THREE.Color(FLOATING_SKILLS_COLOR)),
      uIntensity: uniform(FLOATING_SKILLS_INTENSITY),
    };

    const material = new THREE.MeshBasicNodeMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      // Keep the letters out of the depth buffer so the AO (which samples
      // depth) doesn't darken around them while they are transparent
      depthWrite: false,
    });

    // Gentle world-space wave, applied after the model matrix (vertexNode
    // replaces the whole projection). From the raw geometry: the old
    // ShaderMaterial ignored the skinning and morphs of island_11 too
    const world = modelWorldMatrix.mul(vec4(positionGeometry, 1));
    const y1 = world.y.add(sin(world.x.mul(10).add(time)).mul(0.02));
    const y2 = y1.add(sin(y1.mul(0.5).add(time)).mul(0.01));
    material.vertexNode = cameraProjectionMatrix.mul(
      cameraViewMatrix.mul(vec4(world.x, y2, world.z, 1))
    );

    // Letter shapes from the atlas alpha, flat glowing color
    const letters = texture(island.materials.magicLetters.map);
    material.colorNode = vec4(
      uniforms.uColor.mul(uniforms.uIntensity),
      letters.a.mul(uniforms.uOpacity)
    );

    return { floatingSkillsMaterial: material, uniforms };
  }, [island]);

  useEffect(
    () => () => floatingSkillsMaterial.dispose(),
    [floatingSkillsMaterial]
  );

  useControls(
    'Skills',
    {
      color: {
        value: FLOATING_SKILLS_COLOR,
        onChange: value => {
          uniforms.uColor.value.set(value);
        },
      },
      intensity: {
        value: FLOATING_SKILLS_INTENSITY,
        min: 0,
        max: 20,
        step: 0.01,
        onChange: value => {
          uniforms.uIntensity.value = value;
        },
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    let floatingSkillsActivation = gsap.to(uniforms.uOpacity, {
      duration: 1,
      delay: 1,
      value: 1,
      ease: 'expo.in',
      paused: true,
    });

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

  return (
    <skinnedMesh
      name="island_11"
      geometry={island.nodes.island_11.geometry}
      material={floatingSkillsMaterial}
      skeleton={island.nodes.island_11.skeleton}
      morphTargetDictionary={island.nodes.island_11.morphTargetDictionary}
      morphTargetInfluences={island.nodes.island_11.morphTargetInfluences}
    />
  );
};

export { FloatingSkills };
