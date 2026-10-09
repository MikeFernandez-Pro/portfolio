import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei/webgpu';
import { OrbitControls as OrbitControlsImpl } from 'three/examples/jsm/controls/OrbitControls.js';
import { useControls } from '#utils/useControls.jsx';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE, IS_PHOTO_MODE } from '#utils/utils.js';

// The directional light sits at this offset from the character it follows
const LIGHT_OFFSET = new THREE.Vector3(-3, 4, 3);
// Shadow camera orientation (it looks from the light at its target). Constant
// since the offset is: its inverse brings a point into light space
const LIGHT_ROTATION = new THREE.Matrix4().lookAt(
  LIGHT_OFFSET,
  new THREE.Vector3(),
  THREE.Object3D.DEFAULT_UP
);
const LIGHT_ROTATION_INVERSE = LIGHT_ROTATION.clone().transpose();
const _snapped = new THREE.Vector3();

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

const Lights = () => {
  const characterLightRef = useRef(null);

  const directionalLightControls = useControls('directionalLight', {
    intensity: {
      value: 13.0,
      min: 0,
      max: 40,
    },
    color: {
      value: '#3d72f7',
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
    // PCF filter radius, in shadow-map texels
    radius: {
      value: 2,
      min: 0,
      max: 10,
      step: 0.1,
    },
    // Shadow map resolution. Transient: the live shadow map must be
    // disposed so three reallocates it at the new size on the next frame
    mapSize: {
      value: 2048,
      options: [512, 1024, 2048, 4096],
      onChange: value => {
        const light = characterLightRef.current;
        if (!light) return;

        light.shadow.mapSize.set(value, value);
        light.shadow.map?.dispose();
        light.shadow.map = null;
      },
    },
  });

  const shadowCameraControls = useControls('Shadow Camera', {
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
  });

  const ambientLightControls = useControls('ambientLight', {
    intensity: {
      value: 4,
      min: 0,
      max: 20,
    },
    color: {
      value: '#2664ff',
    },
  });

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
            const light = characterLightRef.current;
            if (characterPosition && light) {
              // Move the shadow camera by whole shadow-map texels only: a
              // sub-texel slide resamples every shadow edge each frame, which
              // makes them shimmer while the character walks
              const { camera: shadowCam, mapSize } = light.shadow;
              const texelX = (shadowCam.right - shadowCam.left) / mapSize.x;
              const texelY = (shadowCam.top - shadowCam.bottom) / mapSize.y;
              _snapped
                .set(
                  characterPosition.x,
                  characterPosition.y,
                  characterPosition.z
                )
                .applyMatrix4(LIGHT_ROTATION_INVERSE);
              _snapped.x = Math.round(_snapped.x / texelX) * texelX;
              _snapped.y = Math.round(_snapped.y / texelY) * texelY;
              _snapped.applyMatrix4(LIGHT_ROTATION);

              targetObject.position.copy(_snapped);
              light.position.copy(_snapped).add(LIGHT_OFFSET);
              light.target = targetObject;
              light.target.updateMatrixWorld();
            }
          }
        );

    scene.add(targetObject);

    return () => {
      scene.remove(targetObject);
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
        position={LIGHT_OFFSET.toArray()}
        intensity={directionalLightControls.intensity}
        color={directionalLightControls.color}
        castShadow={!IS_MOBILE_DEVICE && !IS_PHOTO_MODE}
        target={targetObject}
        // The mapSize control's onChange only runs after mount: the
        // precompile frame already needs the full-size map
        shadow-mapSize={[2048, 2048]}
        shadow-bias={directionalLightControls.bias}
        shadow-normalBias={directionalLightControls.normalBias}
        shadow-radius={directionalLightControls.radius}
      />

      <ShadowDebugView
        lightRef={characterLightRef}
        enabled={shadowCameraControls.debugHelpers}
      />

      <pointLight position={[-9.7, 12, -59.5]} intensity={45} color="#ad7351" />
    </>
  );
};

export default Lights;
