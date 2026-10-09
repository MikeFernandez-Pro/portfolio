import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * drei's <AdaptiveDpr pixelated>: scales the pixel ratio with
 * performance.current (driven by <PerformanceMonitor>) and switches the canvas
 * to pixelated upscaling while it is lowered. Local copy because drei 11's
 * reads state.gl, which R3F 10 leaves null with the WebGPU renderer.
 */
const AdaptiveDpr = () => {
  const canvas = useThree(state => state.renderer.domElement);
  const current = useThree(state => state.performance.current);
  const initialDpr = useThree(state => state.viewport.initialDpr);
  const setDpr = useThree(state => state.setDpr);

  useEffect(() => {
    setDpr(current * initialDpr);
    canvas.style.imageRendering = current === 1 ? 'auto' : 'pixelated';
  }, [current, initialDpr, setDpr, canvas]);

  useEffect(
    () => () => {
      setDpr(initialDpr);
      canvas.style.imageRendering = 'auto';
    },
    [initialDpr, setDpr, canvas]
  );

  return null;
};

export { AdaptiveDpr };
