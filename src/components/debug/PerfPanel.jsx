import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { PerformanceMonitor } from './perfMonitor/performanceMonitor.js';
import { PerformanceView } from './perfMonitor/performanceView.js';

// The post-processing renders in the scheduler's 'render' phase, so the
// monitor brackets the whole frame from outside: begin() in 'start' (app logic
// included in the CPU time), end() in 'finish', after the render pass.
const BEGIN_FRAME = { phase: 'start' };
const END_FRAME = { phase: 'finish' };

/**
 * Floating frame-performance panel (FPS/CPU/GPU sparklines + draw calls,
 * triangles, textures...), bottom-left, away from the Tweakpane controls.
 */
const PerfPanel = () => {
  const gl = useThree(state => state.renderer);
  const monitorRef = useRef(null);

  useEffect(() => {
    const monitor = new PerformanceMonitor({ renderer: gl });
    const view = new PerformanceView({ monitor });

    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed',
      left: '8px',
      bottom: '8px',
      width: '220px',
      maxHeight: 'calc(100vh - 16px)',
      overflowY: 'auto',
      overscrollBehavior: 'contain',
      background: 'rgba(22, 24, 29, 0.92)',
      borderRadius: '6px',
      zIndex: '1000',
    });
    container.appendChild(view.element);
    document.body.appendChild(container);

    view.start();
    monitorRef.current = monitor;

    return () => {
      monitorRef.current = null;
      view.dispose();
      monitor.dispose();
      container.remove();
    };
  }, [gl]);

  useFrame(() => {
    monitorRef.current?.begin();
  }, BEGIN_FRAME);

  useFrame(() => {
    monitorRef.current?.end();
  }, END_FRAME);

  return null;
};

export { PerfPanel };
