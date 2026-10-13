import { useRef, useCallback, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei/webgpu';

import {
  BODY_TYPE_DYNAMIC as DYNAMIC,
  BODY_TYPE_FIXED as FIXED,
} from '#physics/PhysicsWorld.js';
import { physicsWorld } from '#physics/world.js';

import { useStore } from '#store';
import { IS_MOBILE_DEVICE } from '#utils/device.js';
import { useControls } from '#debug/useControls.jsx';

import CharacterModel from '#assets/models/character/character.glb';
import runningSoundEffect, {
  playRunningSound,
  stopRunningSound,
} from '#character/runningSound.js';

import { useCharacterMaterial } from '#character/useCharacterMaterial.js';
import { useCharacterLantern } from '#character/lantern/useCharacterLantern.js';
import { useHeadOrb } from '#character/useHeadOrb.js';
import { useCharacterBody } from '#character/hooks/useCharacterBody.js';
import { useFallingClip } from '#character/hooks/useFallingClip.js';
import { useKeyboardControls } from '#character/hooks/useKeyboardControls.js';
import { useThirdPersonCamera } from '#character/hooks/useThirdPersonCamera.js';
import { useCharacterAnimation } from '#character/hooks/useCharacterAnimation.js';
import { DeathParticles } from '#character/deathCycle/DeathParticles.jsx';
import { die, SPAWN_POINT } from '#character/deathCycle/deathCycle.js';
import { FallAndDeathZones } from '#character/deathCycle/FallAndDeathZones.jsx';
import { directionOffset, updateMovement } from '#character/updateMovement.js';
import {
  ANIMATION_IDLE as IDLE,
  ANIMATION_RUN as RUN,
  ANIMATION_SPRINT as SPRINT,
  ANIMATION_JUMP as JUMP,
  ANIMATION_FALLING as FALLING,
  CHARACTER_JUMP_SPEED,
  DEFAULT_CHARACTER_SPEED,
  DEFAULT_CHARACTER_SPRINT_SPEED,
} from '#character/constants.js';

// Fallback death height: the death zone is the primary trigger; dropping
// below this causes death even if the sensor intersection was missed
const DEATH_HEIGHT = -3;

const CharacterController = () => {
  // Locomotion state, mutated by the input handlers, the zones and the frame
  // loop (no re-render)
  const stateRef = useRef(null);
  if (!stateRef.current) {
    stateRef.current = {
      speed: DEFAULT_CHARACTER_SPEED,
      canJump: false,
      moving: false,
      jumping: false,
      // Set by the falling zone: the character fell off an island and plays
      // the falling animation until the death cycle hands back to idle
      falling: false,
      sprinting: false,
      respawning: false,
      // Debug preview (Inspector panel): suspends the controller loop so the
      // falling animation can be watched and tuned in place
      fallingPreview: false,
    };
  }
  const s = stateRef.current;

  // Mobile
  const joystickAngleRef = useRef(useStore.getState().joystickAngle);

  const { characterBody, groupRef: characterGroupRef } = useCharacterBody();
  const characterMesh = useRef();

  const { scene, animations } = useGLTF(CharacterModel);

  const characterAnimations = useAnimations(
    useFallingClip(scene, animations),
    scene
  );
  const animation = useCharacterAnimation(characterAnimations);

  // Character material and its dissolve, followed by the lantern and the
  // head orb
  const dissolve = useCharacterMaterial(scene);

  // Character lantern (attached to the hips bone, swings with movement)
  useCharacterLantern({ scene, characterBody, characterMesh, dissolve });

  // Glowing orb inside the head
  useHeadOrb(scene, dissolve);

  // Debug: play the falling animation in place (useFallingClip adds the body
  // pitch to the same folder). The preview freezes the body and suspends the
  // controller loop so gameplay code doesn't override the animation
  useControls('Falling', {
    playFalling: () => {
      s.fallingPreview = true;
      stopRunningSound();
      characterBody.current.setBodyType(FIXED);
      animation.play(FALLING);
    },
    stopPreview: () => {
      s.fallingPreview = false;
      characterBody.current.setBodyType(DYNAMIC);
      animation.play(IDLE);
    },
  });

  // Death, from the death zone (or the fallback DEATH_HEIGHT check): the
  // character freezes in the falling pose while the death cycle dissolves
  // it away, teleports it to the spawn point and forms it back
  const killCharacter = useCallback(() => {
    if (s.respawning) return;
    s.respawning = true;
    stopRunningSound();
    characterBody.current.setBodyType(FIXED);
    s.jumping = false;
    s.sprinting = false;
    animation.play(FALLING);

    die(characterBody.current.translation(), {
      onTeleport: () => {
        characterBody.current.setTranslation(SPAWN_POINT);
        // Reset visual orientation to default
        if (characterMesh.current) {
          characterMesh.current.rotation.set(0, Math.PI, 0);
        }
        // Back on solid ground: form back in idle, not the falling pose
        s.falling = false;
        animation.play(IDLE);
      },
      onRespawned: () => {
        s.respawning = false;
        characterBody.current.setBodyType(DYNAMIC);
      },
    });
  }, [animation, characterBody, s]);

  // Character jump event. Falling and respawning own the animation: no jump
  // until the character is back on its feet (the grounded fallback can
  // re-enable canJump while the body is held FIXED during the respawn)
  const characterJumpEvent = () => {
    if (!s.canJump || s.falling || s.respawning) return;
    if (s.fallingPreview) return;
    if (useStore.getState().introControlsLocked) return;
    s.jumping = true;
    s.canJump = false;
    // The body idles FIXED until the first movement (and after a window
    // blur); wake it so a standstill jump actually leaves the ground instead
    // of only playing the animation
    if (characterBody.current.bodyType() === FIXED) {
      characterBody.current.setBodyType(DYNAMIC);
    }
    // Kill the grounded grace window, or it would re-enable jumping for a
    // few frames after takeoff
    characterBody.current.clearGrounded();
    // The frame loop only writes the store flag while canJump is still true,
    // so a jump has to publish the takeoff itself (the grass trample releases
    // the blades while airborne and stamps the landing)
    useStore.setState({ characterGrounded: false });
    // Uniform jump strength: the impulse cancels whatever vertical velocity
    // the slope climb added, so takeoff speed is CHARACTER_JUMP_SPEED on any
    // ground (adding a fixed impulse jumped visibly higher uphill)
    characterBody.current.applyImpulse({
      x: 0,
      y:
        (CHARACTER_JUMP_SPEED - characterBody.current.linvel().y) *
        characterBody.current.mass(),
      z: 0,
    });
    animation.play(JUMP);
  };

  // Sprint can start now: jumping, falling and respawning own the animation
  const canStartSprint = () =>
    animation.current !== SPRINT && !s.jumping && !s.falling && !s.respawning;

  // Keep the vertical velocity (gravity, jump), drop the horizontal one
  const stopHorizontal = () => {
    const body = characterBody.current;
    body.setLinvel({ x: 0, y: body.linvel().y, z: 0 });
  };

  // Keyboard controls (desktop)
  const { eventKeys, resetKeys } = useKeyboardControls({
    onSpaceDown: characterJumpEvent,
    onShiftDown: () => {
      if (!s.moving) return;
      s.speed = DEFAULT_CHARACTER_SPRINT_SPEED;
      s.sprinting = true;
      // Falling / respawning own the animation; the sprint flag stays set so
      // the frame loop picks the sprint up on landing if shift is still held
      if (canStartSprint()) {
        animation.play(SPRINT);
        // Increase playback rate when sprinting
        runningSoundEffect.rate(1.5);
      }
    },
    onShiftUp: () => {
      // Revert sprint effect
      s.sprinting = false;
      s.speed = DEFAULT_CHARACTER_SPEED;
      // Restore running playback rate
      runningSoundEffect.rate(1.1);
    },
  });

  // Pause character physics and keystroke handling
  const pauseCharacter = useCallback(() => {
    resetKeys();
    characterBody.current.setBodyType(FIXED);
  }, [resetKeys, characterBody]);

  useFrame((state, delta) => {
    // Debug falling preview: whole controller suspended while tweaking
    if (s.fallingPreview) return;

    // Intro camera pan: input ignored, the character idles
    const controlsLocked = useStore.getState().introControlsLocked;
    const direction = controlsLocked ? undefined : directionOffset(eventKeys);
    s.moving = direction !== undefined;

    if (s.moving && s.sprinting && canStartSprint()) {
      animation.play(SPRINT);
    }

    const characterPosition = characterBody.current.translation();

    // Grounded state straight from the contact solve (normals steeper than
    // ~45° don't count; short grace for bumps and edges). Replaced the old
    // ground trimesh sensor + zero-velocity fallback — contact normals can't
    // miss events the way thin-trimesh sensor intersections did.
    const characterGrounded = characterBody.current.isGrounded();
    if (characterGrounded && (!s.canJump || s.jumping || s.falling)) {
      s.canJump = true;
      s.jumping = false;
      s.falling = false;
      useStore.setState({ characterGrounded: true });
    } else if (!characterGrounded && s.canJump) {
      s.canJump = false;
      useStore.setState({ characterGrounded: false });
    }

    // Primary death trigger is the death zone; this catches the character
    // if it slips past the sensor (killCharacter ignores a second call)
    if (characterPosition.y < DEATH_HEIGHT) {
      killCharacter();
    }

    // Block movement while respawning
    if (s.respawning) {
      stopRunningSound();
      // The falling pose survives the dissolve; anything else resets to idle
      if (animation.current !== IDLE && animation.current !== FALLING) {
        animation.play(IDLE);
      }
      stopHorizontal();
      return;
    }

    // Update character velocity and orientation
    if (
      controlsLocked ||
      (direction === undefined && !IS_MOBILE_DEVICE) ||
      (IS_MOBILE_DEVICE && joystickAngleRef.current === undefined)
    ) {
      stopRunningSound();
      if (animation.current !== IDLE && !s.jumping && !s.falling) {
        animation.play(IDLE);
      }
      stopHorizontal();
      return;
    }

    if (characterBody.current.bodyType() === FIXED)
      characterBody.current.setBodyType(DYNAMIC);

    if (animation.current !== RUN && !s.jumping && !s.sprinting && !s.falling) {
      animation.play(RUN);
      playRunningSound();
    }

    updateMovement({
      characterBody,
      characterMesh,
      direction,
      joystickAngle: joystickAngleRef.current,
      characterSpeed: s.speed,
      delta,
    });
  });

  useLayoutEffect(() => {
    // Mobile: the joystick drives the movement angle (no shadows)
    if (IS_MOBILE_DEVICE) {
      return useStore.subscribe(
        state => state.joystickAngle,
        joystickAngle => (joystickAngleRef.current = joystickAngle)
      );
    }

    scene.traverse(object => {
      if (object.isMesh || object.isSkinnedMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // Leaving the window drops the held keys and freezes the body
    window.addEventListener('blur', pauseCharacter);
    return () => window.removeEventListener('blur', pauseCharacter);
  }, []);

  useThirdPersonCamera(characterBody);

  // Advance the physics AFTER the controller and camera useFrames, matching
  // the update order of the rapier <Physics> wrapper (its step ran last, so
  // the camera always read the previous step's translation). Keep this the
  // last frame callback registered here
  useFrame((state, delta) => {
    physicsWorld.step(delta);
  });

  return (
    <>
      {/* Positioned and played by the death cycle; outside the body group so
          the teleport to the spawn point never drags it along */}
      <DeathParticles />
      {/* Fell off an island: the fall starts the moment the character
          crosses the falling zone under the island edges, then the death
          zone below (or the DEATH_HEIGHT fallback) causes death */}
      <FallAndDeathZones
        onFallingZoneEnter={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          if (s.respawning || s.falling) return;
          s.falling = true;
          // Falling off the edge with downward momentum can cross the zone
          // while the grounded grace window is still open — without this the
          // next frame would count as grounded, reset the falling flag and
          // cancel the falling animation for the rest of the drop (the zone
          // enter never re-fires)
          characterBody.current.clearGrounded();
          stopRunningSound();
          animation.play(FALLING);
        }}
        onDeathZoneEnter={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          killCharacter();
        }}
      />
      <group ref={characterGroupRef}>
        {/* Visual-only y offset of the mesh inside the body group (the
            capsule collider and physics are untouched) */}
        <primitive
          ref={characterMesh}
          object={scene}
          scale={0.18}
          rotation-y={Math.PI}
          position-y={-0.02}
        />
      </group>
    </>
  );
};

useGLTF.preload(CharacterModel);

export default CharacterController;
