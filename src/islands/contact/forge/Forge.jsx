import { useEffect, useMemo, useRef } from 'react';
import { Howl } from 'howler';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';

import { ForgeSparks } from './ForgeSparks.jsx';
import { useStore } from '#store';
import { SOUND_VOLUMES } from '#utils/soundVolumes.js';
import { REDUCED_MOTION_AT_LOAD } from '#utils/reducedMotion.js';

import HammerSoundEffect from '#assets/sounds/hammer.mp3';

const HAMMER_POSITION = new THREE.Vector3(-5.8, 1.8, -10.8);
const HAMMER_MAX_DISTANCE = 17;
// Reduced motion: strike half as often. The sparks stay - they are the
// impact itself, a hammer hitting nothing would read as broken
const HAMMER_INTERVAL = REDUCED_MOTION_AT_LOAD ? 4000 : 2000;

const Forge = props => {
  const { islandAnimations } = props;

  const forgeHammerAnimationRef = useRef();
  const forgeSparksRef = useRef();
  const experienceStartedRef = useRef(useStore.getState().experienceStarted);

  const hammerSoundEffect = useMemo(
    () =>
      new Howl({
        src: [HammerSoundEffect],
        autoplay: false,
        volume: 0,
      }),
    []
  );

  useEffect(() => {
    /**
     * Animations
     */
    islandAnimations.actions['anvilAnimation'].loop = THREE.LoopOnce;
    islandAnimations.actions['anvilAnimation'].clampWhenFinished = true;

    /**
     * Storage Subscriptions
     */
    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (experienceStarted) {
          experienceStartedRef.current = true;
        }
      }
    );

    const unsubCharacterPosition = useStore.subscribe(
      state => state.characterPosition,
      characterPosition => {
        if (characterPosition) {
          hammerSoundEffect.volume(
            HAMMER_POSITION.distanceTo(characterPosition) < HAMMER_MAX_DISTANCE
              ? Math.min(
                  1 / HAMMER_POSITION.distanceTo(characterPosition),
                  0.2
                ) * SOUND_VOLUMES.hammer
              : 0
          );
        }
      }
    );

    /**
     * Sounds Effects
     */
    // Play forge hammer sound and anvil animation each HAMMER_INTERVAL

    const forgeHammerInterval = setInterval(() => {
      islandAnimations.actions['anvilAnimation'].reset().play();
      forgeHammerAnimationRef.current = gsap.fromTo(
        forgeSparksRef.current.uProgress,
        { value: 0 },
        {
          value: 1,
          duration: 0.5,
          delay: 0.1,
          ease: 'linear',
        }
      );

      if (!experienceStartedRef.current) return;
      hammerSoundEffect.play();
    }, HAMMER_INTERVAL);

    // Clear animations, interval and subscriptions on unmount
    return () => {
      islandAnimations.actions['anvilAnimation'].stop();
      // Unset until the first strike
      forgeHammerAnimationRef.current?.kill();
      forgeHammerAnimationRef.current = null;

      unsubExperienceStarted();
      unsubCharacterPosition();
      clearInterval(forgeHammerInterval);
    };
  }, []);

  return <ForgeSparks forgeSparksRef={forgeSparksRef} />;
};

export { Forge };
