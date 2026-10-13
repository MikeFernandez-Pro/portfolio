import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { useStore } from '#store';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';

const FINISH_PHASE = { phase: 'finish' };

/**
 * Builds every material's pipeline up front so nothing hitches the first time
 * it comes into view (drei's <Preload all> equivalent for WebGPURenderer).
 * Hidden objects are shown for one warm-up frame, then hidden again: that
 * frame builds every node material (TSL -> WGSL) and pipeline in the exact
 * render contexts the app draws them in (scene pass, shadow pass,
 * post-processing quads). Mount it inside the Suspense boundary so it runs
 * once the scene has loaded.
 *
 * renderer.compileAsync is not used. It targets the canvas context, so the
 * first real frame rebuilt everything anyway. And it yields to the main
 * thread after every build stage of every material, which costs a whole
 * requestAnimationFrame where scheduler.yield is missing (Safari, every iOS
 * browser): about 8s on an iPhone 15 Pro for under 1s of actual work.
 *
 * `sceneReady` flips after one more frame, which absorbs the GPU-side
 * compile (the iris is still closed, nothing shows).
 */
const PrecompileScene = () => {
  const scene = useThree(state => state.scene);
  const hiddenRef = useRef([]);
  // Frames rendered since the warm-up started; -1 = done
  const frameRef = useRef(-1);

  // Debug: how long the warm-up takes (CPU frame, then until sceneReady)
  const startRef = useRef(0);

  useLayoutEffect(() => {
    startRef.current = performance.now();
    if (DEBUG_ENABLED) {
      console.info(`Warm-up start at ${startRef.current.toFixed(0)} ms`);
    }
    const hidden = [];
    scene.traverse(object => {
      if (!object.visible) {
        hidden.push(object);
        object.visible = true;
      }
    });
    hiddenRef.current = hidden;
    frameRef.current = 0;
  }, [scene]);

  useFrame(() => {
    if (frameRef.current < 0) return;
    frameRef.current++;

    if (frameRef.current === 1) {
      hiddenRef.current.forEach(object => (object.visible = false));
      hiddenRef.current = [];
      if (DEBUG_ENABLED) {
        console.info(
          `Warm-up frame: ${(performance.now() - startRef.current).toFixed(0)} ms`
        );
      }
    } else {
      frameRef.current = -1;
      useStore.setState({ sceneReady: true });
      if (DEBUG_ENABLED) {
        console.info(
          `Warm-up until Enter: ${(performance.now() - startRef.current).toFixed(0)} ms`
        );
      }
    }
  }, FINISH_PHASE);

  return null;
};

export { PrecompileScene };
