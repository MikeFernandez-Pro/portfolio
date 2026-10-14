import { useCallback, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three/webgpu';
import {
  ANIMATION_IDLE as IDLE,
  ANIMATION_JUMP as JUMP,
} from '#character/constants.js';

/**
 * Crossfades the character between its clips. `play(name)` fades out the
 * current clip and in the new one (no-op if it is already playing);
 * `current` is the clip playing now.
 */
export function useCharacterAnimation(characterAnimations) {
  const currentAnimationRef = useRef(IDLE);

  // Configure one-off animation props
  useEffect(() => {
    // Default state
    characterAnimations.actions[IDLE].fadeIn(0.2).play();
    // Jump config
    characterAnimations.actions[JUMP].loop = THREE.LoopOnce;
    characterAnimations.actions[JUMP].clampWhenFinished = true;
  }, [characterAnimations]);

  const play = useCallback(
    newAnimation => {
      const prev = currentAnimationRef.current;
      if (prev === newAnimation) return;
      characterAnimations.actions[prev].fadeOut(0.2);
      currentAnimationRef.current = newAnimation;
      characterAnimations.actions[newAnimation].reset().fadeIn(0.2).play();
    },
    [characterAnimations]
  );

  return useMemo(
    () => ({
      play,
      get current() {
        return currentAnimationRef.current;
      },
    }),
    [play]
  );
}
