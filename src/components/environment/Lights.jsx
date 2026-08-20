import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE, IS_PHOTO_MODE } from '#utils/utils.js';

/**
 * Renders the scene through a free OrbitControls camera while the gameplay
 * camera keeps following the character (visible via CameraHelper).
 */
const ShadowDebugView = ({ lightRef, enabled }) => {
  const debugCameraRef = useRef(null);
  const orbitControlsRef = useRef(null);
  const helpersRef = useRef([]);
  const mainCamera = useThree(state => state.camera);
  const scene = useThree(state => state.scene);
  const gl = useThree(state => state.gl);

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

  // Draw the scene from the debug camera after R3F/postprocessing use the main cam
  useFrame(({ gl: renderer, scene: world, size }) => {
    if (!enabled || !debugCameraRef.current) return;

    orbitControlsRef.current?.update();

    renderer.setRenderTarget(null);
    renderer.setViewport(0, 0, size.width, size.height);
    renderer.setScissorTest(false);
    renderer.clear(true, true, true);
    renderer.render(world, debugCameraRef.current);
  }, 1);

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

const Lights = () => {
  const characterLightRef = useRef(null);
  const pointLightRef = useRef(null);

  const directionalLightControls = useControls(
    'directionalLight',
    {
      intensity: {
        value: 17.0,
        min: 0,
        max: 40,
      },
      color: {
        value: '#3a62c8',
      },
      bias: {
        value: 0,
        min: -0.01,
        max: 0.01,
        step: 0.0001,
      },
      normalBias: {
        value: 0.13,
        min: 0,
        max: 0.2,
        step: 0.001,
      },
      radius: {
        value: 8.2,
        min: 0,
        max: 25,
        step: 0.1,
      },
    },
    { collapsed: true }
  );

  const shadowCameraControls = useControls(
    'Shadow Camera',
    {
      debugHelpers: false,
      near: {
        value: -5,
        min: -10,
        max: 50,
        step: 0.1,
      },
      far: {
        value: 36,
        min: 1,
        max: 200,
        step: 1,
      },
      top: {
        value: 22,
        min: 1,
        max: 100,
        step: 1,
      },
      right: {
        value: 5,
        min: 1,
        max: 100,
        step: 1,
      },
      bottom: {
        value: -15,
        min: -100,
        max: -1,
        step: 1,
      },
      left: {
        value: -42,   
        min: -100,
        max: -1,
        step: 1,
      },
    },
    { collapsed: true }
  );

  const ambientLightControls = useControls(
    'ambientLight',
    {
      intensity: {
        value: 7.5,
        min: 0,
        max: 20,
      },
      color: {
        value: '#526cad',
      },
    },
    { collapsed: true }
  );

  const scene = useThree(state => state.scene);
  const targetObject = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const light = characterLightRef.current;
    if (!light) return;

    const shadowCam = light.shadow.camera;
    shadowCam.near = shadowCameraControls.near;
    shadowCam.far = shadowCameraControls.far;
    shadowCam.top = shadowCameraControls.top;
    shadowCam.right = shadowCameraControls.right;
    shadowCam.bottom = shadowCameraControls.bottom;
    shadowCam.left = shadowCameraControls.left;
    shadowCam.updateProjectionMatrix();
  }, [
    shadowCameraControls.near,
    shadowCameraControls.far,
    shadowCameraControls.top,
    shadowCameraControls.right,
    shadowCameraControls.bottom,
    shadowCameraControls.left,
  ]);

  useLayoutEffect(() => {
    const unsubCharacterPosition = IS_MOBILE_DEVICE
      ? undefined
      : useStore.subscribe(
          state => state.characterPosition,
          characterPosition => {
            if (characterPosition && characterLightRef.current) {
              targetObject.position.set(
                characterPosition.x,
                characterPosition.y,
                characterPosition.z
              );
              characterLightRef.current.position.set(
                characterPosition.x - 3,
                characterPosition.y + 4,
                characterPosition.z + 3
              );
              characterLightRef.current.target = targetObject;
              characterLightRef.current.target.updateMatrixWorld();
            }
          }
        );

    scene.add(targetObject);

    return () => {
      scene.remove(targetObject);

      if (IS_MOBILE_DEVICE) return;

      unsubCharacterPosition?.();
    };
  }, []);

  return (
    <>
      <ambientLight
        intensity={ambientLightControls.intensity}
        color={ambientLightControls.color}
      />
      <directionalLight
        ref={characterLightRef}
        position={[-3, 4, 3]}
        intensity={directionalLightControls.intensity}
        color={directionalLightControls.color}
        castShadow={!IS_MOBILE_DEVICE && !IS_PHOTO_MODE}
        target={targetObject}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={shadowCameraControls.near}
        shadow-camera-far={shadowCameraControls.far}
        shadow-camera-top={shadowCameraControls.top}
        shadow-camera-right={shadowCameraControls.right}
        shadow-camera-bottom={shadowCameraControls.bottom}
        shadow-camera-left={shadowCameraControls.left}
        shadow-bias={directionalLightControls.bias}
        shadow-normalBias={directionalLightControls.normalBias}
        shadow-radius={directionalLightControls.radius}
      />

      <ShadowDebugView
        lightRef={characterLightRef}
        enabled={shadowCameraControls.debugHelpers}
      />

      <pointLight
        ref={pointLightRef}
        position={[-9.7, 12, -59.5]}
        intensity={45}
        color="#ad7351"
      />
    </>
  );
};

export default Lights;
