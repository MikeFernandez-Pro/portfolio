import { useLayoutEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei/webgpu';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import * as THREE from 'three/webgpu';

/**
 * Renders the scene through a free OrbitControls camera while the gameplay
 * camera keeps following the character (visible via CameraHelper).
 * Rendered only with DEBUG_ENABLED, so it tree-shakes out of production.
 */
const ShadowDebugView = ({ lightRef, enabled }) => {
  const debugCameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const helpersRef = useRef([]);
  const mainCamera = useThree(state => state.camera);
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.renderer);

  useLayoutEffect(() => {
    if (!enabled || !debugCameraRef.current) return;

    const controls = new OrbitControlsImpl(
      debugCameraRef.current,
      gl.domElement
    );
    controls.enableDamping = true;
    orbitControlsRef.current = controls;

    return () => {
      controls.dispose();
      orbitControlsRef.current = null;
    };
  }, [enabled, gl.domElement]);

  useLayoutEffect(() => {
    if (!enabled) return;

    const helpers = [];

    const mainCameraHelper = new THREE.CameraHelper(mainCamera);
    scene.add(mainCameraHelper);
    helpers.push(mainCameraHelper);

    const light = lightRef.current;
    if (light?.shadow?.camera) {
      const shadowCameraHelper = new THREE.CameraHelper(light.shadow.camera);
      scene.add(shadowCameraHelper);
      helpers.push(shadowCameraHelper);
    }

    if (light) {
      const directionalLightHelper = new THREE.DirectionalLightHelper(
        light,
        2,
        '#ffdd66'
      );
      scene.add(directionalLightHelper);
      helpers.push(directionalLightHelper);
    }

    helpersRef.current = helpers;

    return () => {
      helpers.forEach(helper => {
        scene.remove(helper);
        helper.dispose?.();
      });
      helpersRef.current = [];
    };
  }, [enabled, mainCamera, scene, lightRef]);

  useFrame(() => {
    if (!enabled) return;

    helpersRef.current.forEach(helper => helper.update?.());
  });

  // Draw the scene from the debug camera after the post-processing used the
  // main cam
  useFrame(
    ({ renderer, scene: world, size }) => {
      if (!enabled || !debugCameraRef.current) return;

      orbitControlsRef.current?.update();

      renderer.setRenderTarget(null);
      renderer.setViewport(0, 0, size.width, size.height);
      renderer.setScissorTest(false);
      renderer.clear(true, true, true);
      renderer.render(world, debugCameraRef.current);
    },
    { phase: 'render', after: 'postProcessing' }
  );

  if (!enabled) return null;

  return (
    <PerspectiveCamera
      ref={debugCameraRef}
      position={[40, 50, 60]}
      fov={50}
      near={0.5}
      far={400}
    />
  );
};

export default ShadowDebugView;
