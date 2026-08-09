import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from '#utils/useControls.jsx';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';

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

  const controls = useControls(
    'MagicGlyphs',
    {
      emissiveIntensity: {
        value: 0,
        min: 0,
        max: 10,
      },
      emissiveColor: {
        value: '#ff6c43',
      },
    },
    { collapsed: true }
  );

  useEffect(() => {
    island.materials.magicPortal.emissive = new THREE.Color(
      controls.emissiveColor
    );
    island.materials.magicPortal.emissiveIntensity = controls.emissiveIntensity;

    // Magic Glyphs Animation
    let magicGlyphEmissiveAnimation = gsap.fromTo(
      island.materials.magicPortal,
      { emissiveIntensity: 0 },
      { duration: 1, emissiveIntensity: 9, paused: true }
    );
    /**
     * Storage Subscriptions
     */
    // Subscribe to magicGlyphActivation zustand store state
    const unsubMagicGlyphActivation = useStore.subscribe(
      state => state.magicGlyphActivation,
      () => {
        magicGlyphActivationRef.current = true;
        magicGlyphEmissiveAnimation.play();

        // Sound Effect
        magicGlyphSoundEffect.play();
        magicGlyphSoundEffect.fade(0, SOUND_VOLUMES.magicGlyph, 500);
      }
    );

    return () => {
      unsubMagicGlyphActivation();
      magicGlyphEmissiveAnimation.kill();
      magicGlyphEmissiveAnimation = null;
    };
  }, [island, controls]);

  useFrame((_state, delta) => {
    if (magicGlyphActivationRef.current) {
      majorGlyph.rotation.y += delta;
      minorGlyph.rotation.y -= delta;
    }
  });

  return null;
};

export { MagicGlyphs };
