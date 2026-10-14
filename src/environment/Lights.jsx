import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useControls } from '#debug/useControls.jsx';
import { DEBUG_ENABLED } from '#debug/debugEnabled.js';
import ShadowDebugView from '#debug/ShadowDebugView.jsx';
import * as THREE from 'three/webgpu';

import { useStore } from '#store';
import { IS_MOBILE_DEVICE } from '#utils/device.js';

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

// The shadow map is redrawn at most ~60 times a second: every frame at 60 Hz,
// every other frame on 120/144 Hz screens (a skipped frame keeps the last map
// and the matrix it was drawn with). 3/4 of a 60 Hz frame, so frame-time
// jitter at 60 Hz never skips one
const SHADOW_MIN_INTERVAL = 0.75 / 60;

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
      value: 0.095,
      min: 0,
      max: 0.2,
      step: 0.001,
    },
    // PCF filter radius, in shadow-map texels
    radius: {
      value: 4,
      min: 0,
      max: 10,
      step: 0.1,
    },
    // 1 = the light is fully blocked in shadow, 0 = no shadow
    shadowDarkness: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
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
        light.shadow.needsUpdate = true;
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
              targetObject.updateMatrixWorld();
            }
          }
        );

    scene.add(targetObject);

    return () => {
      scene.remove(targetObject);
      unsubCharacterPosition?.();
    };
  }, []);

  // Shadow refresh cap (SHADOW_MIN_INTERVAL); the light follows the
  // character every frame, its shadow catches up on the next redraw
  const lastShadowUpdateRef = useRef(-Infinity);
  useFrame(({ elapsed }) => {
    const light = characterLightRef.current;
    if (!light?.castShadow) return;
    if (elapsed - lastShadowUpdateRef.current >= SHADOW_MIN_INTERVAL) {
      light.shadow.needsUpdate = true;
      lastShadowUpdateRef.current = elapsed;
    }
  });

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
        castShadow={!IS_MOBILE_DEVICE}
        target={targetObject}
        // The mapSize control's onChange only runs after mount: the
        // precompile frame already needs the full-size map
        shadow-mapSize={[2048, 2048]}
        // Redrawn on request only (useFrame above); the first request is
        // already set for the precompile frame
        shadow-autoUpdate={false}
        shadow-needsUpdate={true}
        shadow-bias={directionalLightControls.bias}
        shadow-normalBias={directionalLightControls.normalBias}
        shadow-radius={directionalLightControls.radius}
        shadow-intensity={directionalLightControls.shadowDarkness}
      />

      {DEBUG_ENABLED && (
        <ShadowDebugView
          lightRef={characterLightRef}
          enabled={shadowCameraControls.debugHelpers}
        />
      )}

      {/* Real three.js light, outside the TSL point light registry: warm
          glow from above over the resume island's sleeping character (the
          sleep Zs rise just below it) */}
      <pointLight
        name="resumeSleeperLight"
        position={[-9.7, 12, -59.5]}
        intensity={45}
        color="#ad7351"
      />
    </>
  );
};

export default Lights;
