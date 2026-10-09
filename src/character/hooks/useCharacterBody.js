import { useCallback, useEffect, useRef } from 'react';

import { CharacterBody } from '#physics/CharacterBody.js';
import { BODY_TYPE_FIXED as FIXED } from '#physics/PhysicsWorld.js';
import { physicsWorld } from '#physics/world.js';

/**
 * The character's physics capsule, registered with the physics world.
 * Returns the body (in a ref, like the other character hooks expect) and the
 * ref callback for the group the physics step keeps in sync with it.
 *
 * Same body rapier built from <RigidBody position-y={0.7} type='fixed'
 * lockRotations> + <CapsuleCollider args={[0.3, 0.25]} position-y={0.58}>.
 * Starts FIXED; the controller switches it DYNAMIC on the first movement.
 */
const useCharacterBody = () => {
  const characterBody = useRef();
  if (!characterBody.current) {
    characterBody.current = new CharacterBody({
      position: [0, 0.7, 0],
      capsuleHalfHeight: 0.3,
      capsuleRadius: 0.25,
      capsuleOffsetY: 0.58,
      bodyType: FIXED,
    });
  }

  const groupRef = useCallback(group => {
    characterBody.current.setObject3D(group);
  }, []);

  useEffect(() => {
    physicsWorld.setCharacterBody(characterBody.current);
    return () => physicsWorld.setCharacterBody(null);
  }, []);

  return { characterBody, groupRef };
};

export { useCharacterBody };
