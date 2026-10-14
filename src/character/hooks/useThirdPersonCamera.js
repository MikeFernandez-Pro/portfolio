import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three/webgpu';

import { subscribeWhenSet, useStore } from '#store';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import {
  prefersReducedMotion,
  REDUCED_MOTION_AT_LOAD,
} from '#utils/reducedMotion.js';

const CAMERA_FOLLOW_HEIGHT = 5.2;
const CAMERA_FOLLOW_DISTANCE = IS_MOBILE_DEVICE ? 7.5 : 5.5;

// Camera offset before the intro pan (also the Canvas camera's start)
export const CAMERA_INITIAL_OFFSET = { x: -3.5, y: 17.4, z: 29.6 };

// Intro camera pan length, and when the character controls unlock during it
// (2s before the end; power3.out: the pan is ~94% done by then)
const CAMERA_INTRO_DURATION = 5;
const INTRO_CONTROLS_UNLOCK_AT = CAMERA_INTRO_DURATION - 2;

const CAMERA_POSITION = new THREE.Vector3(0, 0, 0);
const LERP_CAMERA_POSITION = new THREE.Vector3(
  0,
  CAMERA_FOLLOW_HEIGHT,
  CAMERA_FOLLOW_DISTANCE
);
const CAMERA_OFFSET = new THREE.Vector3(
  CAMERA_INITIAL_OFFSET.x,
  CAMERA_INITIAL_OFFSET.y,
  CAMERA_INITIAL_OFFSET.z
);

const cameraOffsetOnMouseMove = event => {
  CAMERA_OFFSET.x = ((event.clientX / window.innerWidth) * 2 - 1) * 0.5;
};

export function useThirdPersonCamera(characterBodyRef) {
  const lastStoreUpdateRef = useRef(0);

  useFrame((state, delta) => {
    const characterPosition = characterBodyRef.current.translation();
    // Throttle store updates to ~30fps, and skip them while the character
    // stands still: translation() is a new object each call, so every write
    // re-runs the subscribers (shadow snap, distance volumes)
    lastStoreUpdateRef.current += delta;
    if (lastStoreUpdateRef.current >= 1 / 30) {
      const stored = useStore.getState().characterPosition;
      if (
        !stored ||
        stored.x !== characterPosition.x ||
        stored.y !== characterPosition.y ||
        stored.z !== characterPosition.z
      ) {
        useStore.setState({ characterPosition });
      }
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
    state.camera.position.copy(LERP_CAMERA_POSITION);
  });

  useEffect(() => {
    let unlockControlsCall = null;
    let introPanAnimation = null;

    // Animate camera offset at experience start
    const unsubExperienceStarted = subscribeWhenSet(
      state => state.experienceStarted,
      () => {
        // Reduced motion: cut to the gameplay angle instead of the 5s pan.
        // Snap the lerp target too, or the follow damping would still swoop
        if (prefersReducedMotion()) {
          CAMERA_OFFSET.set(0, 4, CAMERA_FOLLOW_DISTANCE);
          const characterPosition = characterBodyRef.current?.translation();
          if (characterPosition) {
            LERP_CAMERA_POSITION.set(
              characterPosition.x,
              Math.max(characterPosition.y, 0),
              characterPosition.z
            ).add(CAMERA_OFFSET);
          }
          return;
        }

        // App locks the controls with experienceStarted (outside reduced
        // motion); the character can move once the pan is almost over
        unlockControlsCall = gsap.delayedCall(INTRO_CONTROLS_UNLOCK_AT, () =>
          useStore.setState({ introControlsLocked: false })
        );

        introPanAnimation = gsap.to(CAMERA_OFFSET, {
          duration: CAMERA_INTRO_DURATION,
          x: 0,
          y: 4,
          z: CAMERA_FOLLOW_DISTANCE,
          ease: 'power3.out',
        });
      }
    );

    // Pointer parallax is decorative camera motion — off under reduced motion
    const parallaxEnabled = !IS_MOBILE_DEVICE && !REDUCED_MOTION_AT_LOAD;
    if (parallaxEnabled) {
      window.addEventListener('mousemove', cameraOffsetOnMouseMove);
    }

    return () => {
      unsubExperienceStarted();
      introPanAnimation?.kill();
      if (unlockControlsCall) {
        unlockControlsCall.kill();
        useStore.setState({ introControlsLocked: false });
      }
      if (parallaxEnabled) {
        window.removeEventListener('mousemove', cameraOffsetOnMouseMove);
      }
    };
  }, []);
}
