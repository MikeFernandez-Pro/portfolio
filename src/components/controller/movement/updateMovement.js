import * as THREE from 'three';

// Reuse math objects to avoid per-frame allocations
const ROTATION_AXIS = new THREE.Vector3(0, 1, 0);
const TARGET_QUATERNION = new THREE.Quaternion();
const HALF_PI = Math.PI / 2;

/**
 * Updates the character physics linear velocity and smoothly rotates the mesh
 * toward the desired facing direction.
 */
export function updateMovement({
  characterBody,
  characterMesh,
  direction,
  joystickAngle,
  isMobileDevice,
  characterSpeed,
  delta,
}) {
  if (!characterBody?.current || !characterMesh?.current) return;

  const body = characterBody.current;

  // Linear velocity
  const angle = isMobileDevice ? joystickAngle : direction;
  const x = characterSpeed * Math.cos(angle) * (isMobileDevice ? 1 : -1);
  const z = characterSpeed * Math.sin(angle) * (isMobileDevice ? -1 : 1);

  body.setLinvel(
    {
      x,
      y: body.linvel().y,
      z,
    },
    true
  );

  // Smooth rotation toward movement direction
  TARGET_QUATERNION.setFromAxisAngle(
    ROTATION_AXIS,
    isMobileDevice ? joystickAngle + HALF_PI : direction - HALF_PI
  );

  characterMesh.current.quaternion.rotateTowards(TARGET_QUATERNION, 15 * delta);
}
