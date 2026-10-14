import * as THREE from 'three/webgpu';

import { IS_MOBILE_DEVICE } from '#utils/device.js';

// Reuse math objects to avoid per-frame allocations
const ROTATION_AXIS = new THREE.Vector3(0, 1, 0);
const TARGET_QUATERNION = new THREE.Quaternion();
const HALF_PI = Math.PI / 2;
// How quickly the character turns toward the inpu. Higher value turns faster.
const TURN_SPEED = 16;

// Keyboard keys held -> movement angle (undefined when not moving)
export const directionOffset = ({ forward, backward, leftward, rightward }) => {
  if (!forward && !backward && !leftward && !rightward) return undefined;

  if (forward && leftward) return (7 * Math.PI) / 4;
  if (forward && rightward) return (5 * Math.PI) / 4;
  if (backward && leftward) return Math.PI / 4;
  if (backward && rightward) return (3 * Math.PI) / 4;
  if (backward) return Math.PI / 2;
  if (leftward) return 0;
  if (rightward) return -Math.PI;

  return -Math.PI / 2;
};

/**
 * Updates the character physics linear velocity and smoothly rotates the mesh
 * toward the desired facing direction (keyboard direction on desktop,
 * joystick angle on mobile).
 */
export function updateMovement({
  characterBody,
  characterMesh,
  direction,
  joystickAngle,
  characterSpeed,
  delta,
}) {
  const body = characterBody.current;

  // Linear velocity
  const angle = IS_MOBILE_DEVICE ? joystickAngle : direction;
  const x = characterSpeed * Math.cos(angle) * (IS_MOBILE_DEVICE ? 1 : -1);
  const z = characterSpeed * Math.sin(angle) * (IS_MOBILE_DEVICE ? -1 : 1);

  body.setLinvel({ x, y: body.linvel().y, z });

  // Smooth rotation toward movement direction: framerate independent
  // exponential lerp, fast at first then easing into the target
  TARGET_QUATERNION.setFromAxisAngle(
    ROTATION_AXIS,
    IS_MOBILE_DEVICE ? joystickAngle + HALF_PI : direction - HALF_PI
  );

  const turnAlpha = 1 - Math.exp(-TURN_SPEED * delta);
  characterMesh.current.quaternion.rotateTowards(TARGET_QUATERNION, turnAlpha);
}
