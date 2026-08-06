import { useRef, useCallback, useLayoutEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { CapsuleCollider, RigidBody } from '@react-three/rapier';

import { useStore } from '#store/ZustandStorage.jsx';
import { IS_MOBILE_DEVICE } from '#utils/utils.js';

import CharacterModel from '#assets/models/character/character.glb';
import runningSoundEffect from '#controller/audio/runningSound.js';

import { directionOffset } from '#controller/CharacterControllerUtils.js';

import { useCharacterMaterial } from '#controller/useCharacterMaterial.js';
import { useKeyboardControls } from '#controller/hooks/useKeyboardControls.js';
import { useThirdPersonCamera } from '#controller/hooks/useThirdPersonCamera.js';
import { useCharacterAnimation } from '#controller/hooks/useCharacterAnimation.js';
import { updateMovement } from '#controller/movement/updateMovement.js';
import SensorCollider from '#controller/SensorCollider.jsx';
import {
  BODY_TYPE_DYNAMIC as DYNAMIC,
  BODY_TYPE_FIXED as FIXED,
  ANIMATION_IDLE as IDLE,
  ANIMATION_RUN as RUN,
  ANIMATION_SPRINT as SPRINT,
  ANIMATION_JUMP as JUMP,
  DEFAULT_CHARACTER_SPEED,
  DEFAULT_CHARACTER_SPRINT_SPEED,
} from '#controller/constants.js';

// Character defaults
let characterSpeed = DEFAULT_CHARACTER_SPEED;
let characterSprintSpeed = DEFAULT_CHARACTER_SPRINT_SPEED;
let canJump = false;
let currentAnimation = IDLE;
let characterIsMoving = false;
let characterJumping = false;
let characterSprinting = false;
let characterRespawning = false;
let groundedFramesCount = 0;

// running sound is managed in #controller/audio/runningSound.js

const CharacterController = () => {
  // Mobile
  const joystickAngleRef = useRef(useStore.getState().joystickAngle);

  const characterBody = useRef();
  const characterMesh = useRef();

  const { scene, animations } = useGLTF(CharacterModel);
  const characterAnimations = useAnimations(animations, scene);
  const animation = useCharacterAnimation(characterAnimations);

  // Character material and respawn effect
  const { playRespawn } = useCharacterMaterial(scene);

  // Adapter: route to animation helper while keeping local state
  const updateCharacterAnimation = useCallback(
    newAnimation => {
      currentAnimation = newAnimation;
      switch (newAnimation) {
        case IDLE:
          animation.playIdle();
          break;
        case RUN:
          animation.playRun();
          break;
        case SPRINT:
          animation.playSprint();
          break;
        case JUMP:
          animation.playJump();
          break;
        default:
          break;
      }
    },
    [animation]
  );

  // Character jump event
  const characterJumpEvent = () => {
    if (canJump) {
      characterJumping = true;
      canJump = false;
      groundedFramesCount = 0;
      characterBody.current.applyImpulse({ x: 0, y: 1.2, z: 0 });
      updateCharacterAnimation(JUMP);
    }
  };

  // Keyboard controls (desktop)
  const { eventKeys, resetKeys } = useKeyboardControls({
    onSpaceDown: () => {
      characterJumpEvent();
    },
    onShiftDown: () => {
      if (!characterIsMoving) return;
      characterSpeed = characterSprintSpeed;
      characterSprinting = true;
      if (currentAnimation !== SPRINT && !characterJumping) {
        updateCharacterAnimation(SPRINT);
        // Increase playback rate when sprinting
        runningSoundEffect.rate(1.5);
      }
    },
    onShiftUp: () => {
      // Revert sprint effect
      characterSprinting = false;
      characterSpeed = DEFAULT_CHARACTER_SPEED;
      // Restore running playback rate
      runningSoundEffect.rate(1.1);
    },
  });

  // Pause character physics and keystroke handling
  const pauseCharacter = useCallback(() => {
    resetKeys();
    characterBody.current.setBodyType(FIXED);
  }, [resetKeys]);

  // Current character direction and position
  let direction;
  let characterPosition;

  useFrame((state, delta) => {
    direction = directionOffset(eventKeys, characterBody);
    characterIsMoving = direction !== undefined ? true : false;

    if (
      characterIsMoving &&
      characterSprinting &&
      currentAnimation !== SPRINT &&
      !characterJumping
    ) {
      updateCharacterAnimation(SPRINT);
    }

    characterPosition = characterBody.current.translation();

    // Grounded fallback: intersection events from the ground sensor can be
    // missed (thin trimesh + variable timestep), which leaves the jump
    // animation stuck and jumping disabled. A few consecutive frames of
    // ~zero vertical velocity means we are standing on something again.
    if (!canJump || characterJumping) {
      if (Math.abs(characterBody.current.linvel().y) < 0.02) {
        groundedFramesCount++;
        if (groundedFramesCount >= 3) {
          canJump = true;
          characterJumping = false;
        }
      } else {
        groundedFramesCount = 0;
      }
    }

    if (characterPosition.y < 0 && !characterRespawning) {
      characterRespawning = true;
      runningSoundEffect.stop();
      characterBody.current.setBodyType(FIXED);
      characterBody.current.setTranslation({ x: 0, y: 0.6, z: 0 }, true);
      // Reset visual orientation to default
      if (characterMesh.current) {
        characterMesh.current.rotation.set(0, Math.PI, 0);
      }
      playRespawn({
        onStart: () => {
          // ensure idle animation while respawning
          if (currentAnimation !== IDLE) updateCharacterAnimation(IDLE);
        },
        onComplete: () => {
          characterRespawning = false;
          characterBody.current.setBodyType(DYNAMIC);
        },
      });
    }
    // Camera follow is managed by useThirdPersonCamera

    /**
     * Character Controller
     */
    // Block movement while respawning
    if (characterRespawning) {
      runningSoundEffect.stop();
      if (currentAnimation !== IDLE && !characterJumping) {
        updateCharacterAnimation(IDLE);
        useStore.setState({ isCharacterMoving: false });
      }
      characterBody.current.setLinvel(
        { x: 0, y: characterBody.current.linvel().y, z: 0 },
        true
      );
      return;
    }

    // Update character velocity and orientation
    if (
      (direction === undefined && !IS_MOBILE_DEVICE) ||
      (IS_MOBILE_DEVICE && joystickAngleRef.current === undefined)
    ) {
      runningSoundEffect.stop();
      if (currentAnimation !== IDLE && !characterJumping) {
        updateCharacterAnimation(IDLE);

        useStore.setState({ isCharacterMoving: false });
      }

      characterBody.current.setLinvel(
        {
          x: 0,
          y: characterBody.current.linvel().y,
          z: 0,
        },
        true
      );
      return;
    }

    if (characterBody.current.bodyType() === FIXED)
      characterBody.current.setBodyType(DYNAMIC);

    if (currentAnimation !== RUN && !characterJumping && !characterSprinting) {
      updateCharacterAnimation(RUN);
      useStore.setState({ isCharacterMoving: true });
      runningSoundEffect.play();
    }

    updateMovement({
      characterBody,
      characterMesh,
      direction,
      joystickAngle: joystickAngleRef.current,
      isMobileDevice: IS_MOBILE_DEVICE,
      characterSpeed,
      delta,
    });
  });

  useLayoutEffect(() => {
    if (!IS_MOBILE_DEVICE) {
      scene.traverse(object => {
        if (object.isMesh || object.isSkinnedMesh) {
          object.castShadow = true;
          object.receiveShadow = true;
        }
      });
    }

    // JoyStick subscriber
    const unsubJoystickAngle = !IS_MOBILE_DEVICE
      ? undefined
      : useStore.subscribe(
          state => state.joystickAngle,
          joystickAngle => (joystickAngleRef.current = joystickAngle)
        );

    // Event Listeners
    if (!IS_MOBILE_DEVICE) {
      window.addEventListener('blur', pauseCharacter);
    }

    return () => {
      if (!IS_MOBILE_DEVICE) {
        window.removeEventListener('blur', pauseCharacter);
      }
      if (IS_MOBILE_DEVICE) unsubJoystickAngle();
    };
  }, []);

  // Initialize third-person camera behavior
  useThirdPersonCamera(characterBody);

  return (
    <>
      <SensorCollider
        onEnter={state => {
          // Only the character should toggle the grounded state
          if (state.other.rigidBody !== characterBody.current) return;
          canJump = true;
          characterJumping = false;
        }}
        onExit={state => {
          if (state.other.rigidBody !== characterBody.current) return;
          canJump = false;
        }}
      />
      <RigidBody
        type={'fixed'}
        lockRotations
        ref={characterBody}
        colliders={false}
        position-y={0.7}
        restitution={-10}
        friction={0}
      >
        <primitive
          ref={characterMesh}
          object={scene}
          scale={0.18}
          rotation-y={Math.PI}
        />
        <CapsuleCollider args={[0.3, 0.25]} position={[0, 0.58, 0]} />
      </RigidBody>
    </>
  );
};

useGLTF.preload(CharacterModel);

export default CharacterController;
