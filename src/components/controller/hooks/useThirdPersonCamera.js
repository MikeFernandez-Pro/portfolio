import { useCallback, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';
import {
  CAMERA_FOLLOW_HEIGHT,
  CAMERA_FOLLOW_DISTANCE_MOBILE,
  CAMERA_FOLLOW_DISTANCE_DESKTOP,
  CAMERA_INITIAL_OFFSET,
} from '#controller/constants.js';

const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const LERP_CAMERA_POSITION = new THREE.Vector3(
  0,
  CAMERA_FOLLOW_HEIGHT,
  IS_MOBILE_DEVICE
    ? CAMERA_FOLLOW_DISTANCE_MOBILE
    : CAMERA_FOLLOW_DISTANCE_DESKTOP
);
let CAMERA_OFFSET = new THREE.Vector3(
  CAMERA_INITIAL_OFFSET.x,
  CAMERA_INITIAL_OFFSET.y,
  CAMERA_INITIAL_OFFSET.z
);

export function useThirdPersonCamera(characterBodyRef) {
  const lastStoreUpdateRef = useRef(0);
  const cameraOffsetOnMouseMove = useCallback(event => {
    CAMERA_OFFSET.x = ((event.clientX / window.innerWidth) * 2 - 1) * 0.5;
  }, []);

  useFrame((state, delta) => {
    const characterPosition = characterBodyRef.current.translation();
    // Throttle store updates to ~30fps
    lastStoreUpdateRef.current += delta;
    if (lastStoreUpdateRef.current >= 1 / 30) {
      useStore.setState({ characterPosition });
      lastStoreUpdateRef.current = 0;
    }

    // Free debug camera: OrbitControls owns the camera; track its position so
    // switching back eases from wherever the user left it instead of jumping
    if (useStore.getState().freeCameraActive) {
      LERP_CAMERA_POSITION.copy(state.camera.position);
      return;
    }

    // Never chase the character below world zero: while it falls into the
    // void (death), the follow target keeps the height it had at the edge
    CAMERA_POSITION.set(
      characterPosition.x,
      Math.max(characterPosition.y, 0),
      characterPosition.z
    ).add(CAMERA_OFFSET);
    // Exact exp-damp alpha: same smoothing rate at any fps, never exceeds 1
    LERP_CAMERA_POSITION.lerp(CAMERA_POSITION, 1 - Math.exp(-5 * delta));
    state.camera.position.set(...LERP_CAMERA_POSITION);
  });

  useEffect(() => {
    // Animate camera offset at experience start
    const unsubExperienceStarted = useStore.subscribe(
      state => state.experienceStarted,
      experienceStarted => {
        if (experienceStarted) {
          gsap.to(CAMERA_OFFSET, {
            duration: 5,
            x: 0,
            y: 4,
            z: IS_MOBILE_DEVICE
              ? CAMERA_FOLLOW_DISTANCE_MOBILE
              : CAMERA_FOLLOW_DISTANCE_DESKTOP,
            ease: 'power3.out',
          });
        }
      }
    );

    if (!IS_MOBILE_DEVICE) {
      window.addEventListener('mousemove', cameraOffsetOnMouseMove);
    }

    return () => {
      unsubExperienceStarted();
      if (!IS_MOBILE_DEVICE) {
        window.removeEventListener('mousemove', cameraOffsetOnMouseMove);
      }
    };
  }, [cameraOffsetOnMouseMove]);
}
