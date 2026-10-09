import { useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import {
  ANIMATION_IDLE as IDLE,
  ANIMATION_RUN as RUN,
  ANIMATION_SPRINT as SPRINT,
  ANIMATION_JUMP as JUMP,
  ANIMATION_FALLING as FALLING,
} from '#character/constants.js';

export function useCharacterAnimation(characterAnimations) {
  const currentAnimationRef = useRef(IDLE);

  // Configure one-off animation props
  useEffect(() => {
    if (!characterAnimations) return;
    // Default state
    characterAnimations.actions[IDLE].fadeIn(0.2).play();
    // Jump config
    characterAnimations.actions[JUMP].loop = THREE.LoopOnce;
    characterAnimations.actions[JUMP].clampWhenFinished = true;
  }, [characterAnimations]);

  const play = useCallback(
    newAnimation => {
      const prev = currentAnimationRef.current;
      if (!characterAnimations || prev === newAnimation) return newAnimation;
      characterAnimations.actions[prev].fadeOut(0.2);
      currentAnimationRef.current = newAnimation;
      characterAnimations.actions[newAnimation].reset().fadeIn(0.2).play();
      return newAnimation;
    },
    [characterAnimations]
  );

  return {
    get current() {
      return currentAnimationRef.current;
    },
    setCurrent: name => (currentAnimationRef.current = name),
    playIdle: () => play(IDLE),
    playRun: () => play(RUN),
    playSprint: () => play(SPRINT),
    playJump: () => play(JUMP),
    playFalling: () => play(FALLING),
  };
}
