import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import {
  MAGIC_PORTAL_LIGHT_DEFAULTS,
  magicPortalLightSettings,
  magicPortalLightUniforms,
} from '#islands/common/islandPointLights.js';

import MagicGlyphSoundEffect from '#assets/sounds/magic-glyph.mp3';

const MagicGlyphs = props => {
  const { island } = props;

  const magicGlyphActivationRef = useRef(false);

  const majorGlyph = island.nodes.glyph;
  const minorGlyph = island.nodes.smallGlyph;

  const magicGlyphSoundEffect = useMemo(
    () =>
      new Howl({
        src: [MagicGlyphSoundEffect],
        autoplay: false,
        volume: SOUND_VOLUMES.magicGlyph,
      }),
    []
  );

  // Progress of the light fade-in (0 → 1 on glyph activation), kept so the
  // intensity control stays accurate before/after the animation
  const lightProgressRef = useRef(0);

  // World Y of the major glyph, resolved in the effect below; the height
  // control offsets the light from it
  const glyphBaseYRef = useRef(null);

  useControls(
    'SkillsPortalLight',
    {
      color: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.color,
        onChange: v => {
          magicPortalLightUniforms.uMagicPortalLightColor.value.set(v);
        },
      },
      intensity: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.intensity,
        min: 0,
        max: 10,
        step: 0.05,
        onChange: v => {
          magicPortalLightSettings.intensity = v;
          magicPortalLightUniforms.uMagicPortalLightIntensity.value =
            v * lightProgressRef.current;
        },
      },
      decay: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.decay,
        min: 0,
        max: 1,
        step: 0.005,
        onChange: v => {
          magicPortalLightUniforms.uMagicPortalLightDecay.value = v;
        },
      },
      decayPower: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.decayPower,
        min: 0.1,
        max: 8,
        step: 0.05,
        onChange: v => {
          magicPortalLightUniforms.uMagicPortalLightDecayPower.value = v;
        },
      },
      height: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.height,
        min: -1,
        max: 5,
        step: 0.01,
        onChange: v => {
          magicPortalLightSettings.height = v;
          if (glyphBaseYRef.current !== null) {
            magicPortalLightUniforms.uMagicPortalLightPosition.value.y =
              glyphBaseYRef.current + v;
          }
        },
      },
      specularPower: {
        value: MAGIC_PORTAL_LIGHT_DEFAULTS.specularPower,
        min: 1,
        max: 64,
        step: 1,
        onChange: v => {
          magicPortalLightUniforms.uMagicPortalLightSpecularPower.value = v;
        },
      },
    },
    { collapsed: true, reset: true }
  );

  useEffect(() => {
    // Off at rest, the activation animation below raises it
    island.materials.magicPortal.emissive = new THREE.Color('#ff6c43');
    island.materials.magicPortal.emissiveIntensity = 0;

    // The island point light sits above the major glyph; its world
    // position lives in the GLB, so it's resolved at runtime
    majorGlyph.updateWorldMatrix(true, false);
    majorGlyph.getWorldPosition(
      magicPortalLightUniforms.uMagicPortalLightPosition.value
    );
    glyphBaseYRef.current =
      magicPortalLightUniforms.uMagicPortalLightPosition.value.y;
    magicPortalLightUniforms.uMagicPortalLightPosition.value.y +=
      magicPortalLightSettings.height;

    // Magic Glyphs Animation
    let magicGlyphEmissiveAnimation = gsap.fromTo(
      island.materials.magicPortal,
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
        magicPortalLightUniforms.uMagicPortalLightIntensity.value =
          magicPortalLightSettings.intensity * lightProgress.value;
      },
    });
    /**
     * Storage Subscriptions
     */
    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => {
        magicGlyphActivationRef.current = true;
        magicGlyphEmissiveAnimation.play();
        magicLightAnimation.play();

        // Sound Effect
        magicGlyphSoundEffect.play();
        magicGlyphSoundEffect.fade(0, SOUND_VOLUMES.magicGlyph, 500);
      }
    );

    return () => {
      unsubMagicGlyphActivation();
      magicGlyphEmissiveAnimation.kill();
      magicGlyphEmissiveAnimation = null;
      magicLightAnimation.kill();
      magicLightAnimation = null;
    };
  }, [island]);

  useFrame((_state, delta) => {
    if (magicGlyphActivationRef.current) {
      majorGlyph.rotation.y += delta;
      minorGlyph.rotation.y -= delta;
    }
  });

  return null;
};

export { MagicGlyphs };
