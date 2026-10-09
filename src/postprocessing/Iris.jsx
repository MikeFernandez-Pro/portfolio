import { useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  Fn,
  If,
  PI,
  abs,
  float,
  fwidth,
  length,
  max,
  sin,
  smoothstep,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import gsap from 'gsap';

import { snoise } from '#shaders/includes/simplexNoise3d.js';
import { rotate2d } from '#shaders/includes/rotate2d.js';

import { IS_PHOTO_MODE } from '#utils/utils.js';
import { useStore } from '#store';
import { prefersReducedMotion } from '#utils/reducedMotion.js';

// Closed iris before the loading peek
const INITIAL_PROGRESS = -0.1;
// Fully open past this progress: the mask is skipped
const REVEALED_PROGRESS = 1.5;

/**
 * Noisy iris mask over the final image. `progress` is the iris radius (the
 * intro tweens it); `aspectRatio` is width / height.
 */
const createIris = () => {
  const uniforms = {
    progress: uniform(IS_PHOTO_MODE ? REVEALED_PROGRESS : INITIAL_PROGRESS),
    size: uniform(15),
    aspectRatio: uniform(1),
    time: uniform(0),
  };

  const apply = Fn(([inputColor]) => {
    const outputColor = vec4(inputColor).toVar();

    // Uniform branch: free once the scene is fully revealed
    If(uniforms.progress.lessThan(REVEALED_PROGRESS), () => {
      const centered = uv().sub(0.5);
      const centeredUv = vec2(centered.x, centered.y.div(uniforms.aspectRatio));

      const safeProgress = max(abs(uniforms.progress), 1e-5);
      const distanceToCenter = length(centeredUv.div(safeProgress));

      const rotatedUv = rotate2d(sin(uniforms.progress).mul(PI)).mul(
        centeredUv
      );

      const perlinNoise = snoise(
        vec3(rotatedUv.mul(uniforms.size), uniforms.time.mul(0.15))
      );

      // Pixel-width AA on the radial field only — fwidth(noise) is unstable
      // and turns the contour into stairs
      const shape = distanceToCenter.sub(uniforms.progress);
      const w = max(fwidth(shape), 1e-5);
      const mask = float(1).sub(
        smoothstep(w.negate(), w, shape.sub(perlinNoise.mul(0.1)))
      );

      outputColor.assign(vec4(max(inputColor.rgb, 0), inputColor.a).mul(mask));
    });

    return outputColor;
  });

  return { apply, uniforms };
};

const useIris = (revealer, aspectRatio) => {
  const { uniforms } = revealer;

  useEffect(() => {
    // Photo mode: no intro sequence — the scene starts fully revealed.
    // A pipeline rebuild (MSAA switch) carries the progress over: no replay
    if (IS_PHOTO_MODE || uniforms.progress.value !== INITIAL_PROGRESS) return;

    // The peek opens once every pipeline is built (sceneReady): before that
    // the first frames stall on shader compilation and the animation would
    // jump instead of play
    let sceneRevealerAnimation = null;
    const unsubSceneReady = useStore.subscribe(
      state => state.sceneReady,
      sceneReady => {
        if (!sceneReady || sceneRevealerAnimation) return;

        // Reduced motion: open the loading peek without the iris animation
        if (prefersReducedMotion()) {
          uniforms.progress.value = 0.35;
          return;
        }

        sceneRevealerAnimation = gsap.to(uniforms.progress, {
          value: 0.35,
          duration: 1,
          ease: 'circ.out',
        });
      },
      { fireImmediately: true }
    );

    return () => {
      unsubSceneReady();
      sceneRevealerAnimation?.kill();
    };
  }, [uniforms]);

  // Resize-only uniform
  useEffect(() => {
    uniforms.aspectRatio.value = aspectRatio;
  }, [uniforms, aspectRatio]);

  useFrame(({ elapsed }) => {
    if (uniforms.progress.value >= REVEALED_PROGRESS) return;
    uniforms.time.value = elapsed;
  });
};

export { createIris, useIris };
