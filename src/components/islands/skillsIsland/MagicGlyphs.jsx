import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';

import MagicGlyphSoundEffect from '#assets/sounds/magic-glyph.mp3';

const MAGIC_GLYPH_SOUND_VOLUME = 0.15;

const MagicGlyphs = props => {
  const { island } = props;

  const magicGlyphActivationRef = useRef(false);

  const majorGlyph = useMemo(
    () => island.scene.children[0].children[5],
    [island]
  );
  const minorGlyph = useMemo(
    () => island.scene.children[0].children[6],
    [island]
  );

  const magicGlyphSoundEffect = useMemo(
    () =>
      new Howl({
        src: [MagicGlyphSoundEffect],
        autoplay: false,
        volume: MAGIC_GLYPH_SOUND_VOLUME,
      }),
    []
  );

  const controls = useControls('MagicGlyphs', {
    emissiveIntensity: {
      value: 0,
      min: 0,
      max: 10,
    },
    emissiveColor: {
      value: '#ff6c43',
    },
  });

  useEffect(() => {
    island.materials.magicPortal.emissive = new THREE.Color(
      controls.emissiveColor
    );
    island.materials.magicPortal.emissiveIntensity = controls.emissiveIntensity;

    // Magic Glyphs Animation
    let magicGlyphEmissiveAnimation = gsap.fromTo(
      island.materials.magicPortal,
      { emissiveIntensity: 0 },
      { duration: 1, emissiveIntensity: 6.6, paused: true }
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
        magicGlyphSoundEffect.fade(0, MAGIC_GLYPH_SOUND_VOLUME, 500);
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
