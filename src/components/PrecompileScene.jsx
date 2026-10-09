import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';

/**
 * Builds every material's pipeline up front so nothing hitches the first time
 * it comes into view (drei's <Preload all> equivalent for WebGPURenderer).
 * Hidden objects are shown for the synchronous scene walk at the start of
 * compileAsync, then hidden again. The frame loop is paused meanwhile: a
 * render between compileAsync's awaits would create the same GPU textures
 * ("Texture already initialized"). Mount it inside the Suspense boundary so
 * it runs once the scene has loaded.
 */
const PrecompileScene = () => {
  const renderer = useThree(state => state.renderer);
  const scene = useThree(state => state.scene);
  const camera = useThree(state => state.camera);
  const setFrameloop = useThree(state => state.setFrameloop);

  useLayoutEffect(() => {
    const hidden = [];
    scene.traverse(object => {
      if (!object.visible) {
        hidden.push(object);
        object.visible = true;
      }
    });

    setFrameloop('never');
    renderer
      .compileAsync(scene, camera)
      .catch(error => console.error(error))
      .finally(() => setFrameloop('always'));

    hidden.forEach(object => (object.visible = false));
  }, [renderer, scene, camera, setFrameloop]);

  return null;
};

export { PrecompileScene };
