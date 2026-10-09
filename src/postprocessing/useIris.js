import { useEffect } from 'react';
import gsap from 'gsap';

import { subscribeWhenSet } from '#store';
import { prefersReducedMotion } from '#utils/reducedMotion.js';

import { INITIAL_PROGRESS } from './iris.js';

// The loading peek, and the aspect ratio
const useIris = (uniforms, aspectRatio) => {
  useEffect(() => {
    // Already past the peek: a hot reload re-runs this effect, which must
    // not close the iris back to it
    if (uniforms.progress.value !== INITIAL_PROGRESS) return;

    // The peek opens once every pipeline is built (sceneReady): before that
    // the first frames stall on shader compilation and the animation would
    // jump instead of play
    let peekAnimation = null;
    const unsubSceneReady = subscribeWhenSet(
      state => state.sceneReady,
      () => {
        if (peekAnimation) return;

        // Reduced motion: open the loading peek without the iris animation
        if (prefersReducedMotion()) {
          uniforms.progress.value = 0.35;
          return;
        }

        peekAnimation = gsap.to(uniforms.progress, {
          value: 0.35,
          duration: 1,
          ease: 'circ.out',
        });
      }
    );

    return () => {
      unsubSceneReady();
      peekAnimation?.kill();
    };
  }, [uniforms]);

  // Resize-only uniform
  useEffect(() => {
    uniforms.aspectRatio.value = aspectRatio;
  }, [uniforms, aspectRatio]);
};

export { useIris };
