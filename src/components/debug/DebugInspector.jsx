import { useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { loadInspector } from '#utils/inspectorControls.jsx';

// The Inspector times frames between begin()/finish(), which three only
// calls from renderer.setAnimationLoop — R3F runs its own scheduler, so the
// frame is bracketed here: begin() in 'start' (app logic counts in the CPU
// time), finish() in 'finish', after the post-processing render
const BEGIN_FRAME = { phase: 'start' };
const END_FRAME = { phase: 'finish' };

/**
 * Attaches three's Inspector (performance, memory, render target viewer,
 * console, and the useControls parameters) to the renderer. Debug only.
 */
const DebugInspector = () => {
  const renderer = useThree(state => state.renderer);

  useEffect(() => {
    loadInspector().then(inspector => {
      renderer.inspector = inspector;
    });
  }, [renderer]);

  useFrame(({ renderer: frameRenderer }) => {
    const inspector = globalThis.__debugInspector;
    if (inspector && frameRenderer.inspector === inspector) inspector.begin();
  }, BEGIN_FRAME);

  useFrame(() => {
    const inspector = globalThis.__debugInspector;
    if (inspector?.isRunning) inspector.finish();
  }, END_FRAME);

  return null;
};

export { DebugInspector };
