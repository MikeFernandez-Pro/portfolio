import { Howl } from 'howler';
import { useEffect, useMemo } from 'react';
import { useRef } from 'react';
import { useStore } from '../../store/ZustandStorage.jsx';
import * as THREE from 'three';
import gsap from 'gsap';

import ForgeSparks from '../ForgeSparks.jsx';

import hammerAudio from '/sounds/hammerSoundEffect.mp3';

const HAMMER_POSITION = new THREE.Vector3(-5.8, 1.8, -10.8);
const HAMMER_MAX_DISTANCE = 17;

const Forge = props => {
  const { islandAnimations } = props;

  const forgeHammerAnimationRef = useRef();
  const forgeSparksRef = useRef();
  const experienceStartedRef = useRef(useStore.getState().experienceStarted);

  const hammerSoundEffect = useMemo(
    () =>
      new Howl({
        src: [hammerAudio],
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
                ) * 0.5
              : 0
          );
        }
      }
    );

    /**
     * Sounds Effects
     */
    // Play forge hammer sound and anvil animation each 2s

    const forgeHammerInterval = setInterval(() => {
      islandAnimations.actions['anvilAnimation'].reset().play();
      forgeHammerAnimationRef.current = gsap.fromTo(
        forgeSparksRef.current.material.uniforms.uProgress,
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
    }, 2000);

    // Clear animations, interval and subscriptions on unmount
    return () => {
      islandAnimations.actions['anvilAnimation'].stop();
      // islandAnimations.actions["magicPotAnimation"].getMixer().uncacheAction(islandAnimations.actions["magicPotAnimation"]);
      forgeHammerAnimationRef.current.kill();
      forgeHammerAnimationRef.current = null;

      unsubExperienceStarted();
      unsubCharacterPosition();
      clearInterval(forgeHammerInterval);
    };
  }, []);

  return <ForgeSparks ref={forgeSparksRef} />;
};

export default Forge;
