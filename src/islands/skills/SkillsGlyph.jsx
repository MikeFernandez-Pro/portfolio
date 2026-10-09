import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#debug/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';

import { useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import { pointLights } from '#islands/world/pointLights/pointLights.js';
import { pointLightControls } from '#islands/world/pointLights/pointLightControls.js';

import GlyphSoundEffect from '#assets/sounds/magic-glyph.mp3';

const SkillsGlyph = props => {
  const { island } = props;
  // The skills glyph material, as named in Blender
  const glyphMaterial = island.materials.magicPortal;

  const awakeRef = useRef(false);

  const majorGlyph = island.nodes.glyph;
  const minorGlyph = island.nodes.smallGlyph;

  const glyphSoundEffect = useMemo(
    () =>
      new Howl({
        src: [GlyphSoundEffect],
        autoplay: false,
        volume: SOUND_VOLUMES.skillsGlyph,
      }),
    []
  );

  // Progress of the light fade-in (0 → 1 on glyph activation), kept so the
  // intensity control stays accurate before/after the animation
  const lightProgressRef = useRef(0);

  // World Y of the major glyph, resolved in the effect below; the height
  // control offsets the light from it
  const glyphBaseYRef = useRef(null);

  const light = pointLights.skillsGlyph;
  useControls(
    'SkillsGlyphLight',
    pointLightControls(light, {
      // Scaled by the awakening fade (lightProgressRef)
      intensity: {
        value: light.defaults.intensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          light.settings.intensity = v;
          light.intensity.value = v * lightProgressRef.current;
        },
      },
      height: {
        value: light.defaults.height,
        min: -1,
        max: 5,
        step: 0.01,
        onChange: v => {
          light.settings.height = v;
          if (glyphBaseYRef.current !== null) {
            light.position.value.y = glyphBaseYRef.current + v;
          }
        },
      },
    })
  );

  useEffect(() => {
    // Off at rest, the activation animation below raises it
    glyphMaterial.emissive = new THREE.Color('#ff6c43');
    glyphMaterial.emissiveIntensity = 0;

    // The island point light sits above the major glyph; its world
    // position lives in the GLB, so it's resolved at runtime
    majorGlyph.updateWorldMatrix(true, false);
    majorGlyph.getWorldPosition(pointLights.skillsGlyph.position.value);
    glyphBaseYRef.current = pointLights.skillsGlyph.position.value.y;
    pointLights.skillsGlyph.position.value.y +=
      pointLights.skillsGlyph.settings.height;

    // Magic Glyphs Animation
    let glyphEmissiveAnimation = gsap.fromTo(
      glyphMaterial,
      { emissiveIntensity: 0 },
      { duration: 1, emissiveIntensity: 9, paused: true }
    );

    // The fake point light fades in along the same activation
    const lightProgress = { value: lightProgressRef.current };
    let magicLightAnimation = gsap.to(lightProgress, {
      duration: 1,
      value: 1,
      paused: true,
      onUpdate: () => {
        lightProgressRef.current = lightProgress.value;
        pointLights.skillsGlyph.intensity.value =
          pointLights.skillsGlyph.settings.intensity * lightProgress.value;
      },
    });
    /**
     * Storage Subscriptions
     */
    // The glyphs light up when the Skills island awakens
    const unsubAwake = useStore.subscribe(
      state => state.skillsIslandAwake,
      () => {
        awakeRef.current = true;
        glyphEmissiveAnimation.play();
        magicLightAnimation.play();

        // Sound Effect
        glyphSoundEffect.play();
        glyphSoundEffect.fade(0, SOUND_VOLUMES.skillsGlyph, 500);
      }
    );

    return () => {
      unsubAwake();
      glyphEmissiveAnimation.kill();
      glyphEmissiveAnimation = null;
      magicLightAnimation.kill();
      magicLightAnimation = null;
    };
  }, [island]);

  useFrame((_state, delta) => {
    if (awakeRef.current) {
      majorGlyph.rotation.y += delta;
      minorGlyph.rotation.y -= delta;
    }
  });

  return null;
};

export { SkillsGlyph };
