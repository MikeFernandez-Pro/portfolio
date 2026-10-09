import { useEffect } from 'react';
import {
  abs,
  float,
  Fn,
  fwidth,
  If,
  length,
  max,
  PI,
  sin,
  smoothstep,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from 'three/tsl';
import gsap from 'gsap';

import { snoise } from '#shaders/includes/simplexNoise3d.js';
import { rotate2d } from '#shaders/includes/rotate2d.js';

import { useStore } from '#store';
import { prefersReducedMotion } from '#utils/reducedMotion.js';

// Closed iris before the loading peek
const INITIAL_PROGRESS = -0.1;
// Fully open past this progress: the mask is skipped
const REVEALED_PROGRESS = 1.5;

// Created once and shared by every pipeline build. `progress` is the iris
// radius (the intro tweens it); `aspectRatio` is width / height
const createIrisUniforms = () => ({
  progress: uniform(INITIAL_PROGRESS),
  size: uniform(15),
  aspectRatio: uniform(1),
});

// Noisy iris mask over the final image: iris(uniforms)(color)
const iris = uniforms =>
  Fn(([inputColor]) => {
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
        vec3(rotatedUv.mul(uniforms.size), time.mul(0.15))
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
    const unsubSceneReady = useStore.subscribe(
      state => state.sceneReady,
      sceneReady => {
        if (!sceneReady || peekAnimation) return;

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
      },
      { fireImmediately: true }
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

export { createIrisUniforms, iris, useIris };
