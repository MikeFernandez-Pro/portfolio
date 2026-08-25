import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import { PerformanceMonitor } from './perfMonitor/performanceMonitor.js';
import { PerformanceView } from './perfMonitor/performanceView.js';

// The composer renders in a useFrame at priority 1, so the monitor brackets
// the whole frame from outside: begin() before every subscriber (app logic
// included in the CPU time), end() after the render pass.
const BEGIN_PRIORITY = -100;
const END_PRIORITY = 100;

/**
 * Floating frame-performance panel (FPS/CPU/GPU sparklines + draw calls,
 * triangles, textures...), bottom-left, away from the Tweakpane controls.
 */
const PerfPanel = () => {
  const gl = useThree(state => state.gl);
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
  }, BEGIN_PRIORITY);

  useFrame(() => {
    monitorRef.current?.end();
  }, END_PRIORITY);

  return null;
};

export { PerfPanel };
