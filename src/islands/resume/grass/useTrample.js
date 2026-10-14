import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';

import { useStore } from '#store';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import {
  DEFAULT_CHARACTER_SPEED,
  DEFAULT_CHARACTER_SPRINT_SPEED,
} from '#character/constants.js';

import { TRAMPLE_SIZE, createTrampleField } from './trampleField.js';

// One field for the app's lifetime (its texture is bound to the material)
const field = createTrampleField();
export const trampleTexture = field.texture;

// Whether any texel still moves. Away from the patch the field is at rest and
// the per-frame spring loop + GPU upload are skipped
let trampleActive = false;

// Step cap: keeps the semi-implicit spring stable and stops a frame hitch
// from launching the blades
const TRAMPLE_MAX_DT = 1 / 30;

// The camera hook publishes characterPosition at ~30 Hz, and only while it
// changes. Velocity samples span the real time between two publications.
// Without one for STOPPED_AFTER the character has stopped (margin over the
// slowest regular gap: two ~33ms frames, plus this hook running first). A
// sample spans at most one publication interval plus the longest frame
// since the last one: after a stop (many short frames) that is about one
// interval instead of the whole idle, after a hitch (one long frame) the
// real gap
const PUBLISH_INTERVAL = 1 / 30;
const STOPPED_AFTER = 0.15;
// Faster than this between two publications is a teleport (respawn), not a
// step: dropped instead of sweeping the blades toward the spawn point
const MAX_SAMPLE_SPEED = 4 * DEFAULT_CHARACTER_SPRINT_SPEED;

/**
 * Presses the character's footprint into the trample field while it walks on
 * the grass patch, and relaxes the field back to rest. `trampleControls` and
 * `patch` ({ position, size }) are read live. Off on mobile, where the
 * material is built without the trample fetch.
 */
export const useTrample = (trampleControls, patch) => {
  // Character tracking: previous grounded state (takeoff / landing
  // detection) and a smoothed world-space velocity from position deltas.
  // Takeoff and landing start an impulse press anchored where they
  // happened, folding the blades over a few frames instead of one
  const wasGroundedRef = useRef(true);
  const previousPositionRef = useRef(null);
  const sinceSampleRef = useRef(0);
  const longestFrameRef = useRef(0);
  const sampledVelocityRef = useRef(new THREE.Vector2());
  const velocityRef = useRef(new THREE.Vector2());
  const impulseRef = useRef({ timer: 0, u: 0, v: 0, radiusScale: 1, peak: 1 });

  useFrame((state, delta) => {
    if (IS_MOBILE_DEVICE) {
      return;
    }

    const dt = Math.min(delta, TRAMPLE_MAX_DT);

    // Character state. The velocity is sampled from the published positions
    // and smoothed every frame, so the press direction doesn't jitter with
    // the publication rate or the physics substeps
    const position = useStore.getState().characterPosition;
    const grounded = useStore.getState().characterGrounded;
    const justLanded = grounded && !wasGroundedRef.current;
    const justJumped = !grounded && wasGroundedRef.current;
    wasGroundedRef.current = grounded;

    const sampled = sampledVelocityRef.current;
    const velocity = velocityRef.current;
    sinceSampleRef.current += delta;
    longestFrameRef.current = Math.max(longestFrameRef.current, delta);
    const sinceSample = sinceSampleRef.current;
    if (position !== previousPositionRef.current) {
      const previous = previousPositionRef.current;
      const elapsed = Math.min(
        sinceSample,
        PUBLISH_INTERVAL + longestFrameRef.current
      );
      if (position && previous && elapsed > 0) {
        sampled.set(
          (position.x - previous.x) / elapsed,
          (position.z - previous.z) / elapsed
        );
        if (sampled.length() > MAX_SAMPLE_SPEED) {
          sampled.set(0, 0);
          velocity.set(0, 0);
        }
      }
      previousPositionRef.current = position;
      sinceSampleRef.current = 0;
      longestFrameRef.current = 0;
    } else if (sinceSample > STOPPED_AFTER) {
      sampled.set(0, 0);
    }

    const smoothing = 1 - Math.exp(-12 * delta);
    velocity.x += (sampled.x - velocity.x) * smoothing;
    velocity.y += (sampled.y - velocity.y) * smoothing;

    // Tread pressure from the smoothed speed: full when running, fading to 0
    // as the character slows so a stop releases the blades over the same
    // ~0.2s the velocity estimate decays, never on/off. Airborne (the jump
    // handler clears the grounded flag) there is no tread press
    const speed = velocity.length();
    const treadPressure = THREE.MathUtils.smoothstep(speed, 0.15, 1.2);
    const impulse = impulseRef.current;
    if (position) {
      const [patchX, , patchZ] = patch.position;
      const u = ((-position.x + patchX) / patch.size) * 0.5 + 0.5;
      const v = ((position.z - patchZ) / patch.size) * 0.5 + 0.5;
      const insidePatch = u > -0.1 && u < 1.1 && v > -0.1 && v < 1.1;
      // World units -> texels (the map spans 2 * patch size)
      const texelsPerUnit = TRAMPLE_SIZE / (2 * patch.size);

      // Takeoff and landing start an impulse press anchored at the feet: a
      // purely radial ring folding at impactFold instead of stamping flat in
      // one frame. Landing presses the wider landingRadius ring at full
      // strength; takeoff a lighter puff barely wider than the footprint
      if ((justLanded || justJumped) && insidePatch) {
        impulse.timer = 3 / trampleControls.impactFold;
        impulse.u = u;
        impulse.v = v;
        impulse.radiusScale = justLanded ? trampleControls.landingRadius : 1.2;
        impulse.peak = justLanded ? 1 : 0.65;
      }

      if (impulse.timer > 0) {
        impulse.timer -= dt;
        field.press(
          impulse.u * TRAMPLE_SIZE,
          impulse.v * TRAMPLE_SIZE,
          trampleControls.radius * texelsPerUnit * impulse.radiusScale,
          0,
          0,
          0,
          1 - Math.exp(-trampleControls.impactFold * dt),
          impulse.peak
        );
        trampleActive = true;
      }

      if (grounded && treadPressure > 0 && insidePatch) {
        // Fully directional only at running speed, radial when idle
        const moveFactor = Math.min(speed / DEFAULT_CHARACTER_SPEED, 1);
        const moveDirX = speed > 0.05 ? velocity.x / speed : 0;
        const moveDirZ = speed > 0.05 ? velocity.y / speed : 0;

        field.press(
          u * TRAMPLE_SIZE,
          v * TRAMPLE_SIZE,
          trampleControls.radius * texelsPerUnit,
          moveDirX,
          moveDirZ,
          trampleControls.directionality * moveFactor,
          1 - Math.exp(-trampleControls.pressSpeed * dt),
          treadPressure
        );
        trampleActive = true;
      }
    }

    if (!trampleActive) return;

    // Damped spring back to rest. Critical damping is 2 * sqrt(k); the ratio
    // control scales it (below 1 the blades overshoot and wobble a little)
    const stiffness = trampleControls.stiffness;
    const damping = 2 * Math.sqrt(stiffness) * trampleControls.dampingRatio;
    trampleActive = field.relax(dt, stiffness, damping);

    // The frame the field settles still uploads once (all zeros), then the
    // pipeline goes quiet
    field.encode();
  });
};
